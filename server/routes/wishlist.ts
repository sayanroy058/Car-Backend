import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/wishlist?userId=...
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: "userId query parameter required" });
    return;
  }
  const rows = db.prepare("SELECT listingId FROM wishlist WHERE userId = ?").all(userId) as { listingId: string }[];
  res.json({ wishlist: rows.map((r) => r.listingId) });
});

// POST /api/wishlist/:listingId
router.post("/:listingId", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.body.userId as string;
  if (!userId) {
    res.status(400).json({ error: "userId required in body" });
    return;
  }
  const { listingId } = req.params;

  const existing = db.prepare("SELECT * FROM wishlist WHERE userId = ? AND listingId = ?").get(userId, listingId);
  if (existing) {
    db.prepare("DELETE FROM wishlist WHERE userId = ? AND listingId = ?").run(userId, listingId);
    res.json({ added: false });
  } else {
    db.prepare("INSERT INTO wishlist (userId, listingId) VALUES (?, ?)").run(userId, listingId);
    res.json({ added: true });
  }
});

export default router;
