import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/tickets — the caller's tickets; admins see all.
router.get("/", (req, res) => {
  const db = getDb();
  const rows =
    req.userRole === "admin"
      ? db.prepare("SELECT * FROM tickets ORDER BY createdAt DESC").all()
      : db
          .prepare(
            `SELECT * FROM tickets
             WHERE userId = ? OR email = (SELECT email FROM users WHERE id = ?)
             ORDER BY createdAt DESC`,
          )
          .all(req.userId, req.userId);
  res.json({ tickets: rows });
});

// POST /api/tickets
router.post("/", (req, res) => {
  const db = getDb();
  const id = `t-${Date.now()}`;
  const { name, email, subject, category, message } = req.body;

  if (!name || !email || !subject || !category || !message) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  db.prepare(
    "INSERT INTO tickets (id, userId, name, email, subject, category, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)"
  ).run(id, req.userId, name, email, subject, category, message, Date.now());

  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  res.status(201).json({ ticket: row });
});

// PATCH /api/tickets/:id — the reporter may edit their own ticket's content;
// only an admin may change its status.
router.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const isAdmin = req.userRole === "admin";
  if (!isAdmin && existing.userId !== req.userId) {
    res.status(403).json({ error: "You can only modify your own tickets" });
    return;
  }

  const { status, subject, category, message } = req.body;
  const sets = [];
  const params = [];

  if (status) {
    if (!isAdmin) {
      res.status(403).json({ error: "Only an admin can change ticket status" });
      return;
    }
    sets.push("status = ?");
    params.push(status);
  }
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
