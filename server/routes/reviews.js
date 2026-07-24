import { Router } from "express";
import { getDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/reviews?listingId=... — public
router.get("/", (req, res) => {
  const db = getDb();
  const listingId = req.query.listingId;
  if (!listingId) {
    res.status(400).json({ error: "listingId query parameter required" });
    return;
  }
  const rows = db.prepare("SELECT * FROM reviews WHERE listingId = ? ORDER BY createdAt DESC").all(listingId);
  res.json({ reviews: rows });
});

// POST /api/reviews — protected
router.post("/", requireAuth, (req, res) => {
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
