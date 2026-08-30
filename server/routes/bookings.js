import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/bookings — a user sees only their own bookings; admins see all.
router.get("/", (req, res) => {
  const db = getDb();
  const rows =
    req.userRole === "admin"
      ? db.prepare("SELECT * FROM bookings ORDER BY createdAt DESC").all()
      : db
          .prepare("SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC")
          .all(req.userId);
  res.json({ bookings: rows });
});

// POST /api/bookings — always attributed to the authenticated caller.
router.post("/", (req, res) => {
  const db = getDb();
  const id = `b-${Date.now()}`;
  const { listingId, buyerName, buyerEmail, buyerPhone, type, amount, reserveFee, tenure, downPayment, scheduledDate, city } = req.body;

  if (!listingId || !buyerName || amount == null) {
    res.status(400).json({ error: "listingId, buyerName, and amount are required" });
    return;
  }

  const listing = db.prepare("SELECT id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  db.prepare(`
    INSERT INTO bookings (id, listingId, userId, buyerName, buyerEmail, buyerPhone, type, amount, reserveFee, tenure, downPayment, status, createdAt, scheduledDate, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
  `).run(
    id, listingId, req.userId, buyerName, buyerEmail ?? "", buyerPhone ?? "",
    type ?? "reserve", amount, reserveFee ?? null, tenure ?? null, downPayment ?? null,
    Date.now(), scheduledDate ?? null, city ?? null,
  );

  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  res.status(201).json({ booking: row });
});

// PATCH /api/bookings/:id — the owner or an admin.
router.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (req.userRole !== "admin" && existing.userId !== req.userId) {
    res.status(403).json({ error: "You can only modify your own bookings" });
    return;
  }

  const { status, scheduledDate, city } = req.body;
  const sets = [];
  const params = [];

  if (status) { sets.push("status = ?"); params.push(status); }
  if (scheduledDate) { sets.push("scheduledDate = ?"); params.push(scheduledDate); }
  if (city) { sets.push("city = ?"); params.push(city); }

  if (sets.length === 0) {
    res.json({ booking: existing });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  res.json({ booking: row });
});

export default router;
