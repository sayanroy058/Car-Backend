import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/wishlist — the caller's wishlist, taken from the verified token
// rather than a client-supplied userId.
router.get("/", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT listingId FROM wishlist WHERE userId = ?").all(req.userId);
  res.json({ wishlist: rows.map((r) => r.listingId) });
});

// POST /api/wishlist/:listingId — toggles membership for the caller.
router.post("/:listingId", (req, res) => {
  const db = getDb();
  const { listingId } = req.params;

  const listing = db.prepare("SELECT id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const existing = db
    .prepare("SELECT 1 FROM wishlist WHERE userId = ? AND listingId = ?")
    .get(req.userId, listingId);

  if (existing) {
    db.prepare("DELETE FROM wishlist WHERE userId = ? AND listingId = ?").run(req.userId, listingId);
    res.json({ added: false });
  } else {
    db.prepare("INSERT INTO wishlist (userId, listingId) VALUES (?, ?)").run(req.userId, listingId);
    res.json({ added: true });
  }
});

export default router;

