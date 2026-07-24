import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/tickets
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.query.userId as string | undefined;
  const userEmail = req.query.email as string | undefined;

  let rows: Record<string, unknown>[];
  if (userId) {
    rows = db.prepare("SELECT * FROM tickets WHERE userId = ? OR email = (SELECT email FROM users WHERE id = ?) ORDER BY createdAt DESC").all(userId, userId) as Record<string, unknown>[];
  } else if (userEmail) {
    rows = db.prepare("SELECT * FROM tickets WHERE email = ? ORDER BY createdAt DESC").all(userEmail) as Record<string, unknown>[];
  } else {
    rows = db.prepare("SELECT * FROM tickets ORDER BY createdAt DESC").all() as Record<string, unknown>[];
  }
  res.json({ tickets: rows });
});

// POST /api/tickets
router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const id = `t-${Date.now()}`;
  const { userId, name, email, subject, category, message } = req.body;

  if (!name || !email || !subject || !category || !message) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  db.prepare(
    "INSERT INTO tickets (id, userId, name, email, subject, category, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)"
  ).run(id, userId ?? null, name, email, subject, category, message, Date.now());

  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  res.status(201).json({ ticket: row });
});

// PATCH /api/tickets/:id
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const { status, subject, category, message } = req.body;
  const sets: string[] = [];
  const params: unknown[] = [];

  if (status) { sets.push("status = ?"); params.push(status); }
  if (subject) { sets.push("subject = ?"); params.push(subject); }
  if (category) { sets.push("category = ?"); params.push(category); }
  if (message) { sets.push("message = ?"); params.push(message); }

  if (sets.length === 0) {
    res.json({ ticket: existing });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  res.json({ ticket: row });
});

export default router;
