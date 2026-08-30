-- Migration 002: Real vehicle specifications, registration number, promotion
-- and dealer profile fields.
--
-- Before this migration the vehicle detail page rendered hardcoded engine,
-- performance and dimension figures identical for every listing. These columns
-- let a listing carry its own verified specs, sourced from the frontend
-- brand/model/variant catalogue at submission time.

-- ── Engine & performance ──
ALTER TABLE listings ADD COLUMN displacementCc INTEGER;
ALTER TABLE listings ADD COLUMN maxPowerBhp REAL;
ALTER TABLE listings ADD COLUMN maxPowerRpm INTEGER;
ALTER TABLE listings ADD COLUMN maxTorqueNm REAL;
ALTER TABLE listings ADD COLUMN maxTorqueRpm INTEGER;
ALTER TABLE listings ADD COLUMN driveTrain TEXT;
ALTER TABLE listings ADD COLUMN mileageKmpl REAL;

-- ── Dimensions & capacity ──
ALTER TABLE listings ADD COLUMN seating INTEGER;
ALTER TABLE listings ADD COLUMN bootSpaceL INTEGER;
ALTER TABLE listings ADD COLUMN fuelTankL INTEGER;
ALTER TABLE listings ADD COLUMN groundClearanceMm INTEGER;
ALTER TABLE listings ADD COLUMN lengthMm INTEGER;
ALTER TABLE listings ADD COLUMN widthMm INTEGER;
ALTER TABLE listings ADD COLUMN heightMm INTEGER;
ALTER TABLE listings ADD COLUMN wheelbaseMm INTEGER;

-- ── Safety ──
ALTER TABLE listings ADD COLUMN airbags INTEGER;

-- ── Seller-declared highlights (JSON array of strings) ──
ALTER TABLE listings ADD COLUMN highlights TEXT;

-- ── Indian vehicle registration number.
-- Stored in full; the API masks it for anonymous callers.
ALTER TABLE listings ADD COLUMN registrationNumber TEXT;

-- ── Paid promotion ("Assured" placement) ──
-- assuredUntil is an epoch-ms expiry; a listing is promoted while it is in the
-- future. Only an admin may set these fields.
ALTER TABLE listings ADD COLUMN assuredPlan TEXT;
ALTER TABLE listings ADD COLUMN assuredUntil INTEGER;
ALTER TABLE listings ADD COLUMN assuredPaymentId TEXT;

-- ── Dealer / firm profile ──
ALTER TABLE users ADD COLUMN avatarUrl TEXT;
ALTER TABLE users ADD COLUMN firmName TEXT;
ALTER TABLE users ADD COLUMN firmLogoUrl TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_assuredUntil ON listings(assuredUntil);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured);
