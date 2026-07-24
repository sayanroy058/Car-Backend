import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "drivehub-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

// Helper to verify JWT and attach userId — used for routes not behind middleware
function verifyToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

// POST /api/auth/login — public
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT id, name, email, phone, role, password FROM users WHERE email = ?")
    .get(email) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = bcrypt.compareSync(password as string, (row.password as string) || "");
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string | null,
    role: row.role as string,
  };

  const token = signToken(user);
  res.json({ user, token });
});

// POST /api/auth/register — public
router.post("/register", (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  if ((password as string).length < 6) {
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
  const hashed = bcrypt.hashSync(password as string, 10);

  db.prepare(
    "INSERT INTO users (id, name, email, role, password) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name as string, email as string, finalRole, hashed);

  const user = { id, name: name as string, email: email as string, phone: null, role: finalRole };
  const token = signToken(user);

  res.status(201).json({ user, token });
});

// GET /api/auth/me — protected (inline JWT verify)
router.get("/me", (req: AuthRequest, res: Response) => {
  const userId = req.userId ?? verifyToken(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?")
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: row });
});

// PATCH /api/auth/profile — protected (inline JWT verify)
router.patch("/profile", (req: AuthRequest, res: Response) => {
  const userId = req.userId ?? verifyToken(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, phone } = req.body;
  const db = getDb();

  if (name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name as string, userId);
  if (phone !== undefined) db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(phone as string, userId);

  const row = db
    .prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?")
    .get(userId) as Record<string, unknown>;

  res.json({ user: row });
});

export default router;
