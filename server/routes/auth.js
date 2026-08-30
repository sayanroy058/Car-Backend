import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "drivehub-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

// Helper to verify JWT and attach userId — used for routes not behind middleware
function verifyToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    return payload.id;
  } catch {
    return null;
  }
}

// POST /api/auth/login — public
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, email, phone, role, password, avatarUrl, firmName, firmLogoUrl FROM users WHERE email = ?",
    )
    .get(email);

  if (!row) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = bcrypt.compareSync(password, row.password || "");
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatarUrl,
    firmName: row.firmName,
    firmLogoUrl: row.firmLogoUrl,
  };

  const token = signToken(user);
  res.json({ user, token });
});

// POST /api/auth/register — public
router.post("/register", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const finalRole = role === "agent" ? "agent" : "user";

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const id = `u-${Date.now()}`;
  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(
    "INSERT INTO users (id, name, email, role, password) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, email, finalRole, hashed);

  const user = { id, name, email, phone: null, role: finalRole };
  const token = signToken(user);

  res.status(201).json({ user, token });
});

// GET /api/auth/me — protected (inline JWT verify)
router.get("/me", (req, res) => {
  const userId = req.userId ?? verifyToken(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, email, phone, role, avatarUrl, firmName, firmLogoUrl FROM users WHERE id = ?",
    )
    .get(userId);

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: row });
});

// PATCH /api/auth/profile — protected (inline JWT verify)
router.patch("/profile", (req, res) => {
  const userId = req.userId ?? verifyToken(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, phone, avatarUrl, firmName, firmLogoUrl } = req.body;
  const db = getDb();

  // Only these columns are user-editable — role and email are not.
  const updates = { name, phone, avatarUrl, firmName, firmLogoUrl };
  const sets = [];
  const params = [];
  for (const [column, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    // `name` is required, so ignore an attempt to blank it.
    if (column === "name" && !String(value).trim()) continue;
    sets.push(`${column} = ?`);
    params.push(value === "" ? null : value);
  }

  if (sets.length) {
    params.push(userId);
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }

  const row = db
    .prepare(
      "SELECT id, name, email, phone, role, avatarUrl, firmName, firmLogoUrl FROM users WHERE id = ?",
    )
    .get(userId);

  res.json({ user: row });
});

export default router;
