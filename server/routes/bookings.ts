import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/bookings
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.query.userId as string | undefined;
  const rows = userId
    ? (db.prepare("SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC").all(userId) as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM bookings ORDER BY createdAt DESC").all() as Record<string, unknown>[]);
  res.json({ bookings: rows });
});

// POST /api/bookings
router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const id = `b-${Date.now()}`;
  const { listingId, userId, buyerName, buyerEmail, buyerPhone, type, amount, reserveFee, tenure, downPayment, scheduledDate, city } = req.body;

  if (!listingId || !buyerName || amount == null) {
    res.status(400).json({ error: "listingId, buyerName, and amount are required" });
    return;
  }

  db.prepare(`
    INSERT INTO bookings (id, listingId, userId, buyerName, buyerEmail, buyerPhone, type, amount, reserveFee, tenure, downPayment, status, createdAt, scheduledDate, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
  `).run(
    id, listingId, userId ?? "", buyerName, buyerEmail ?? "", buyerPhone ?? "",
    type ?? "reserve", amount, reserveFee ?? null, tenure ?? null, downPayment ?? null,
    Date.now(), scheduledDate ?? null, city ?? null,
  );

  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  res.status(201).json({ booking: row });
});

// PATCH /api/bookings/:id
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const { status, scheduledDate, city } = req.body;
  const sets: string[] = [];
  const params: unknown[] = [];

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
