import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/saved-searches
router.get("/", (req, res) => {
  const db = getDb();
  const userId = req.query.userId;
  const rows = userId
    ? db.prepare("SELECT * FROM saved_searches WHERE userId = ? ORDER BY createdAt DESC").all(userId)
    : db.prepare("SELECT * FROM saved_searches ORDER BY createdAt DESC").all();

  const searches = rows.map((r) => ({
    ...r,
    filters: JSON.parse(r.filters),
  }));
  res.json({ searches });
});

// POST /api/saved-searches
router.post("/", (req, res) => {
  const db = getDb();
  const id = `ss-${Date.now()}`;
  const { userId, name, filters } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  db.prepare(
    "INSERT INTO saved_searches (id, userId, name, filters, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId ?? null, name, JSON.stringify(filters ?? {}), Date.now());

  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(id);
  res.status(201).json({ search: { ...row, filters: JSON.parse(row.filters) } });
});

// DELETE /api/saved-searches/:id
router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM saved_searches WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
