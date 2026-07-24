import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

function rowToListing(row: Record<string, unknown>) {
  return {
    ...row,
    images: JSON.parse(row.images as string),
    pricing: row.pricing ? JSON.parse(row.pricing as string) : undefined,
    featured: !!(row.featured as number),
  };
}

// GET /api/listings
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM listings ORDER BY createdAt DESC").all() as Record<string, unknown>[];
  res.json({ listings: rows.map(rowToListing) });
});

// GET /api/listings/search
router.get("/search", (req: Request, res: Response) => {
  const db = getDb();
  const { q, brand, body, fuel, trans, own, state, priceMin, priceMax, yearMin, yearMax, kmMin, kmMax, sort } = req.query;

  let query = "SELECT * FROM listings WHERE (status = 'listed' OR status = 'approved')";
  const params: unknown[] = [];

  if (q && typeof q === "string") {
    query += " AND (brand || ' ' || model || ' ' || variant LIKE ?)";
    params.push(`%${q}%`);
  }
  if (brand) {
    const brands = typeof brand === "string" ? brand.split(",").filter(Boolean) : [];
    if (brands.length) {
      query += ` AND brand IN (${brands.map(() => "?").join(",")})`;
      params.push(...brands);
    }
  }
  if (body) {
    const bodies = typeof body === "string" ? body.split(",").filter(Boolean) : [];
    if (bodies.length) {
      query += ` AND bodyType IN (${bodies.map(() => "?").join(",")})`;
      params.push(...bodies);
    }
  }
  if (fuel) {
    const fuels = typeof fuel === "string" ? fuel.split(",").filter(Boolean) : [];
    if (fuels.length) {
      query += ` AND fuelType IN (${fuels.map(() => "?").join(",")})`;
      params.push(...fuels);
    }
  }
  if (trans) {
    const transmissions = typeof trans === "string" ? trans.split(",").filter(Boolean) : [];
    if (transmissions.length) {
      query += ` AND transmission IN (${transmissions.map(() => "?").join(",")})`;
      params.push(...transmissions);
    }
  }
  if (own) {
    const ownerships = typeof own === "string" ? own.split(",").filter(Boolean) : [];
    if (ownerships.length) {
      query += ` AND ownership IN (${ownerships.map(() => "?").join(",")})`;
      params.push(...ownerships);
    }
  }
  if (state) {
    const states = typeof state === "string" ? state.split(",").filter(Boolean) : [];
    if (states.length) {
      query += ` AND registrationState IN (${states.map(() => "?").join(",")})`;
      params.push(...states);
    }
  }
  if (priceMin) { query += " AND expectedPrice >= ?"; params.push(Number(priceMin)); }
  if (priceMax) { query += " AND expectedPrice <= ?"; params.push(Number(priceMax)); }
  if (yearMin) { query += " AND year >= ?"; params.push(Number(yearMin)); }
  if (yearMax) { query += " AND year <= ?"; params.push(Number(yearMax)); }
  if (kmMin) { query += " AND kmDriven >= ?"; params.push(Number(kmMin)); }
  if (kmMax) { query += " AND kmDriven <= ?"; params.push(Number(kmMax)); }

  const sortParam = (sort as string) ?? "newest";
  if (sortParam === "price_low") query += " ORDER BY expectedPrice ASC";
  else if (sortParam === "price_high") query += " ORDER BY expectedPrice DESC";
  else if (sortParam === "km_low") query += " ORDER BY kmDriven ASC";
  else query += " ORDER BY createdAt DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  res.json({ listings: rows.map(rowToListing) });
});

// GET /api/listings/:id
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({ listing: rowToListing(row) });
});

// GET /api/listings/:id/similar
router.get("/:id/similar", (req: Request, res: Response) => {
  const db = getDb();
  const target = db.prepare("SELECT bodyType FROM listings WHERE id = ?").get(req.params.id) as { bodyType?: string } | undefined;
  if (!target) {
    res.json({ listings: [] });
    return;
  }

  const rows = db.prepare(
    "SELECT * FROM listings WHERE id != ? AND bodyType = ? LIMIT 3"
  ).all(req.params.id, target.bodyType) as Record<string, unknown>[];

  res.json({ listings: rows.map(rowToListing) });
});

// POST /api/listings
router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const id = `l-${Date.now()}`;
  const createdAt = Date.now();
  const images = JSON.stringify(req.body.images ?? []);
  const pricing = req.body.pricing ? JSON.stringify(req.body.pricing) : null;

  db.prepare(`
    INSERT INTO listings (id, sellerId, sellerName, sellerEmail, sellerPhone, brand, model, variant,
      year, registrationYear, fuelType, transmission, kmDriven, ownership, registrationState,
      registrationCity, vin, insuranceStatus, roadTaxStatus, serviceHistory, accidentHistory,
      keys, exteriorCondition, interiorCondition, engineCondition, tireCondition, batteryCondition,
      defects, modifications, description, expectedPrice, address, preferredContactTime, bodyType,
      images, status, pricing, createdAt, views, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.body.sellerId ?? "anon", req.body.sellerName, req.body.sellerEmail ?? "", req.body.sellerPhone ?? "",
    req.body.brand, req.body.model, req.body.variant ?? "",
    req.body.year, req.body.registrationYear ?? req.body.year, req.body.fuelType, req.body.transmission,
    req.body.kmDriven, req.body.ownership, req.body.registrationState, req.body.registrationCity,
    req.body.vin ?? "", req.body.insuranceStatus, req.body.roadTaxStatus,
    req.body.serviceHistory, req.body.accidentHistory, req.body.keys, req.body.exteriorCondition,
    req.body.interiorCondition, req.body.engineCondition, req.body.tireCondition, req.body.batteryCondition,
    req.body.defects ?? "", req.body.modifications ?? "", req.body.description ?? "",
    req.body.expectedPrice, req.body.address ?? "", req.body.preferredContactTime, req.body.bodyType,
    images, "pending_review", pricing, createdAt, 0, 0,
  );

  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json({ listing: rowToListing(row) });
});

// PATCH /api/listings/:id
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const fields = [
    "brand", "model", "variant", "year", "registrationYear", "fuelType", "transmission",
    "kmDriven", "ownership", "registrationState", "registrationCity", "vin", "insuranceStatus",
    "roadTaxStatus", "serviceHistory", "accidentHistory", "keys", "exteriorCondition",
    "interiorCondition", "engineCondition", "tireCondition", "batteryCondition", "defects",
    "modifications", "description", "expectedPrice", "address", "preferredContactTime", "bodyType",
    "status",
  ];

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  if (req.body.images) {
    sets.push("images = ?");
    params.push(JSON.stringify(req.body.images));
  }
  if (req.body.pricing) {
    sets.push("pricing = ?");
    params.push(JSON.stringify(req.body.pricing));
  }
  if (req.body.featured !== undefined) {
    sets.push("featured = ?");
    params.push(req.body.featured ? 1 : 0);
  }

  if (sets.length === 0) {
    res.json({ listing: rowToListing(existing) });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE listings SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id) as Record<string, unknown>;
  res.json({ listing: rowToListing(row) });
});

export default router;
