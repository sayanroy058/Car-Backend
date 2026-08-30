import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/saved-searches — the caller's saved searches.
router.get("/", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM saved_searches WHERE userId = ? ORDER BY createdAt DESC")
    .all(req.userId);

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
  const { name, filters } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  db.prepare(
    "INSERT INTO saved_searches (id, userId, name, filters, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).run(id, req.userId, name, JSON.stringify(filters ?? {}), Date.now());

  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(id);
  res.status(201).json({ search: { ...row, filters: JSON.parse(row.filters) } });
});

// DELETE /api/saved-searches/:id — scoped to the caller so one user cannot
// delete another's saved search.
router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM saved_searches WHERE id = ? AND userId = ?")
    .run(req.params.id, req.userId);

  if (result.changes === 0) {
    res.status(404).json({ error: "Saved search not found" });
    return;
  }
  res.json({ success: true });
});

export default router;

