import { Router, type Response } from "express";
import { getDb } from "../db";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/reviews?listingId=... — public
router.get("/", (req: AuthRequest, res: Response) => {
  const db = getDb();
  const listingId = req.query.listingId as string | undefined;
  if (!listingId) {
    res.status(400).json({ error: "listingId query parameter required" });
    return;
  }
  const rows = db.prepare("SELECT * FROM reviews WHERE listingId = ? ORDER BY createdAt DESC").all(listingId) as Record<string, unknown>[];
  res.json({ reviews: rows });
});

// POST /api/reviews — protected
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = `r-${Date.now()}`;
  const { listingId, name, rating, title, body } = req.body;

  if (!listingId || !name || rating == null || !title || !body) {
    res.status(400).json({ error: "listingId, name, rating, title, and body are required" });
    return;
  }

  db.prepare(
    "INSERT INTO reviews (id, listingId, userId, name, rating, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, listingId, req.userId ?? "", name, rating, title, body, Date.now());

  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
  res.status(201).json({ review: row });
});

export default router;
