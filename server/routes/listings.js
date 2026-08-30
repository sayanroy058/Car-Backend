import { Router } from "express";
import { getDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { maskRegistrationNumber } from "../lib/registration.js";

const router = Router();

/**
 * Columns a seller/agent may set when creating or editing a listing.
 * Deliberately excludes status, pricing, featured and the assured* fields —
 * those are admin-only and handled separately.
 */
const SELLER_FIELDS = [
  "brand", "model", "variant", "year", "registrationYear", "fuelType", "transmission",
  "kmDriven", "ownership", "registrationState", "registrationCity", "vin",
  "registrationNumber", "insuranceStatus", "roadTaxStatus", "serviceHistory",
  "accidentHistory", "keys", "exteriorCondition", "interiorCondition", "engineCondition",
  "tireCondition", "batteryCondition", "defects", "modifications", "description",
  "expectedPrice", "address", "preferredContactTime", "bodyType",
  // Specifications resolved from the vehicle catalogue at submission time.
  "displacementCc", "maxPowerBhp", "maxPowerRpm", "maxTorqueNm", "maxTorqueRpm",
  "driveTrain", "mileageKmpl", "seating", "bootSpaceL", "fuelTankL",
  "groundClearanceMm", "lengthMm", "widthMm", "heightMm", "wheelbaseMm", "airbags",
];

/** Columns only an admin may change. */
const ADMIN_FIELDS = ["status", "assuredPlan", "assuredUntil", "assuredPaymentId"];

/**
 * Shapes a DB row into the API representation.
 * `viewerId`/`viewerRole` decide whether the registration number is revealed:
 * the owning seller and admins see it in full, everyone else sees it masked.
 */
function rowToListing(row, viewerId, viewerRole) {
  const canSeeFullReg = viewerRole === "admin" || (viewerId && viewerId === row.sellerId);
  return {
    ...row,
    images: JSON.parse(row.images),
    pricing: row.pricing ? JSON.parse(row.pricing) : undefined,
    highlights: row.highlights ? JSON.parse(row.highlights) : [],
    featured: !!row.featured,
    registrationNumber: canSeeFullReg
      ? (row.registrationNumber ?? undefined)
      : maskRegistrationNumber(row.registrationNumber),
  };
}

/**
 * Promoted ("Assured") listings sort first while their placement is unexpired,
 * then manually featured ones, then the caller's chosen ordering.
 */
function promotionOrder() {
  return "(assuredUntil IS NOT NULL AND assuredUntil > ?) DESC, featured DESC, ";
}

// GET /api/listings
router.get("/", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM listings ORDER BY ${promotionOrder()} createdAt DESC`)
    .all(Date.now());
  res.json({ listings: rows.map((r) => rowToListing(r, req.userId, req.userRole)) });
});

// GET /api/listings/search
router.get("/search", (req, res) => {
  const db = getDb();
  const { q, brand, body, fuel, trans, own, state, priceMin, priceMax, yearMin, yearMax, kmMin, kmMax, sort } = req.query;

  let query = "SELECT * FROM listings WHERE (status = 'listed' OR status = 'approved')";
  const params = [];

  if (q && typeof q === "string") {
    query += " AND (brand || ' ' || model || ' ' || variant LIKE ?)";
    params.push(`%${q}%`);
  }

  // Multi-value facets are comma-separated and expanded into an IN (...) clause.
  const facets = [
    ["brand", brand],
    ["bodyType", body],
    ["fuelType", fuel],
    ["transmission", trans],
    ["ownership", own],
    ["registrationState", state],
  ];
  for (const [column, raw] of facets) {
    if (!raw || typeof raw !== "string") continue;
    const values = raw.split(",").filter(Boolean);
    if (!values.length) continue;
    query += ` AND ${column} IN (${values.map(() => "?").join(",")})`;
    params.push(...values);
  }

  if (priceMin) { query += " AND expectedPrice >= ?"; params.push(Number(priceMin)); }
  if (priceMax) { query += " AND expectedPrice <= ?"; params.push(Number(priceMax)); }
  if (yearMin) { query += " AND year >= ?"; params.push(Number(yearMin)); }
  if (yearMax) { query += " AND year <= ?"; params.push(Number(yearMax)); }
  if (kmMin) { query += " AND kmDriven >= ?"; params.push(Number(kmMin)); }
  if (kmMax) { query += " AND kmDriven <= ?"; params.push(Number(kmMax)); }

  // Promoted listings lead every ordering.
  query += ` ORDER BY ${promotionOrder()}`;
  params.push(Date.now());

  const sortParam = sort ?? "newest";
  if (sortParam === "price_low") query += "expectedPrice ASC";
  else if (sortParam === "price_high") query += "expectedPrice DESC";
  else if (sortParam === "km_low") query += "kmDriven ASC";
  else query += "createdAt DESC";

  const rows = db.prepare(query).all(...params);
  res.json({ listings: rows.map((r) => rowToListing(r, req.userId, req.userRole)) });
});

// GET /api/listings/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({ listing: rowToListing(row, req.userId, req.userRole) });
});

// GET /api/listings/:id/similar
router.get("/:id/similar", (req, res) => {
  const db = getDb();
  const target = db.prepare("SELECT bodyType FROM listings WHERE id = ?").get(req.params.id);
  if (!target) {
    res.json({ listings: [] });
    return;
  }

  const rows = db.prepare(
    `SELECT * FROM listings
     WHERE id != ? AND bodyType = ? AND (status = 'listed' OR status = 'approved')
     ORDER BY ${promotionOrder()} createdAt DESC
     LIMIT 3`
  ).all(req.params.id, target.bodyType, Date.now());

  res.json({ listings: rows.map((r) => rowToListing(r, req.userId, req.userRole)) });
});


// POST /api/listings — authenticated. The listing is always attributed to the
// caller and always starts in pending_review; a seller cannot self-publish.
router.post("/", requireAuth, (req, res) => {
  const db = getDb();
  const id = `l-${Date.now()}`;
  const createdAt = Date.now();
  const images = JSON.stringify(req.body.images ?? []);
  const highlights = JSON.stringify(
    Array.isArray(req.body.highlights) ? req.body.highlights : [],
  );

  const required = ["brand", "model", "year", "fuelType", "transmission", "expectedPrice"];
  const missing = required.filter((f) => req.body[f] === undefined || req.body[f] === "");
  if (missing.length) {
    res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    return;
  }

  // Build the column list from the allowlist so new spec fields need no changes
  // here, and unknown/privileged keys in the body are ignored.
  const columns = ["id", "sellerId", "sellerName", "sellerEmail", "sellerPhone"];
  const values = [
    id,
    req.userId,
    req.body.sellerName ?? "",
    req.body.sellerEmail ?? "",
    req.body.sellerPhone ?? "",
  ];

  for (const f of SELLER_FIELDS) {
    columns.push(f);
    values.push(req.body[f] ?? null);
  }

  columns.push("images", "highlights", "status", "pricing", "createdAt", "views", "featured");
  values.push(images, highlights, "pending_review", null, createdAt, 0, 0);

  db.prepare(
    `INSERT INTO listings (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`
  ).run(...values);

  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
  res.status(201).json({ listing: rowToListing(row, req.userId, req.userRole) });
});

// PATCH /api/listings/:id — authenticated. Sellers may edit their own listing's
// descriptive fields; status, pricing, featured and promotion are admin-only.
router.patch("/:id", requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const isAdmin = req.userRole === "admin";
  const isOwner = existing.sellerId === req.userId;
  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: "You can only edit your own listings" });
    return;
  }

  const sets = [];
  const params = [];

  for (const f of SELLER_FIELDS) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  if (isAdmin) {
    for (const f of ADMIN_FIELDS) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
    if (req.body.pricing !== undefined) {
      sets.push("pricing = ?");
      params.push(req.body.pricing ? JSON.stringify(req.body.pricing) : null);
    }
    if (req.body.featured !== undefined) {
      sets.push("featured = ?");
      params.push(req.body.featured ? 1 : 0);
    }
  }

  if (req.body.images) {
    sets.push("images = ?");
    params.push(JSON.stringify(req.body.images));
  }
  if (req.body.highlights !== undefined) {
    sets.push("highlights = ?");
    params.push(JSON.stringify(Array.isArray(req.body.highlights) ? req.body.highlights : []));
  }

  if (sets.length === 0) {
    res.json({ listing: rowToListing(existing, req.userId, req.userRole) });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE listings SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id);
  res.json({ listing: rowToListing(row, req.userId, req.userRole) });
});

export default router;
