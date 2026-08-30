import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

/**
 * GET /api/offers
 * - ?listingId=... → offers on that listing, visible to the listing's seller
 *   and to admins.
 * - otherwise → offers the caller made, plus offers on the caller's listings.
 *   Admins see everything.
 */
router.get("/", (req, res) => {
  const db = getDb();
  const listingId = req.query.listingId;

  if (listingId) {
    const listing = db.prepare("SELECT sellerId FROM listings WHERE id = ?").get(listingId);
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (req.userRole !== "admin" && listing.sellerId !== req.userId) {
      res.status(403).json({ error: "Not authorised to view offers on this listing" });
      return;
    }
    const rows = db
      .prepare("SELECT * FROM offers WHERE listingId = ? ORDER BY createdAt DESC")
      .all(listingId);
    res.json({ offers: rows });
    return;
  }

  const rows =
    req.userRole === "admin"
      ? db.prepare("SELECT * FROM offers ORDER BY createdAt DESC").all()
      : db
          .prepare(
            `SELECT o.* FROM offers o
             LEFT JOIN listings l ON l.id = o.listingId
             WHERE o.buyerId = ? OR l.sellerId = ?
             ORDER BY o.createdAt DESC`,
          )
          .all(req.userId, req.userId);

  res.json({ offers: rows });
});

// POST /api/offers — the offer is attributed to the authenticated caller.
router.post("/", (req, res) => {
  const db = getDb();
  const id = `o-${Date.now()}`;
  const { listingId, buyerName, amount, message } = req.body;

  if (!listingId || !buyerName || amount == null) {
    res.status(400).json({ error: "listingId, buyerName, and amount are required" });
    return;
  }

  const listing = db.prepare("SELECT sellerId FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.sellerId === req.userId) {
    res.status(400).json({ error: "You cannot make an offer on your own listing" });
    return;
  }

  db.prepare(
    "INSERT INTO offers (id, listingId, buyerId, buyerName, amount, message, state, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
  ).run(id, listingId, req.userId, buyerName, amount, message ?? "", Date.now());

  const row = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  res.status(201).json({ offer: row });
});

// PATCH /api/offers/:id — accept/decline/counter. Only the seller of the
// listing (or an admin) may change an offer's state.
router.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const listing = db.prepare("SELECT sellerId FROM listings WHERE id = ?").get(existing.listingId);
  const isSeller = listing && listing.sellerId === req.userId;
  if (req.userRole !== "admin" && !isSeller) {
    res.status(403).json({ error: "Only the seller can respond to this offer" });
    return;
  }

  const { state, counterAmount } = req.body;
  const sets = [];
  const params = [];

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

