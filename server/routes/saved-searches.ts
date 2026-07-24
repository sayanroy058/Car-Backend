import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/saved-searches
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.query.userId as string | undefined;
  const rows = userId
    ? (db.prepare("SELECT * FROM saved_searches WHERE userId = ? ORDER BY createdAt DESC").all(userId) as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM saved_searches ORDER BY createdAt DESC").all() as Record<string, unknown>[]);

  const searches = rows.map((r) => ({
    ...r,
    filters: JSON.parse(r.filters as string),
  }));
  res.json({ searches });
});

// POST /api/saved-searches
router.post("/", (req: Request, res: Response) => {
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

  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json({ search: { ...row, filters: JSON.parse(row.filters as string) } });
});

// DELETE /api/saved-searches/:id
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM saved_searches WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
