import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/offers
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const listingId = req.query.listingId as string | undefined;
  const rows = listingId
    ? (db.prepare("SELECT * FROM offers WHERE listingId = ? ORDER BY createdAt DESC").all(listingId) as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM offers ORDER BY createdAt DESC").all() as Record<string, unknown>[]);
  res.json({ offers: rows });
});

// POST /api/offers
router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const id = `o-${Date.now()}`;
  const { listingId, buyerId, buyerName, amount, message } = req.body;

  if (!listingId || !buyerName || amount == null) {
    res.status(400).json({ error: "listingId, buyerName, and amount are required" });
    return;
  }

  db.prepare(
    "INSERT INTO offers (id, listingId, buyerId, buyerName, amount, message, state, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
  ).run(id, listingId, buyerId ?? null, buyerName, amount, message ?? "", Date.now());

  const row = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  res.status(201).json({ offer: row });
});

// PATCH /api/offers/:id
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const { state, counterAmount } = req.body;
  const sets: string[] = [];
  const params: unknown[] = [];

  if (state) { sets.push("state = ?"); params.push(state); }
  if (counterAmount !== undefined) { sets.push("counterAmount = ?"); params.push(counterAmount); }

  if (sets.length === 0) {
    res.json({ offer: existing });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE offers SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  const row = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  res.json({ offer: row });
});

export default router;
