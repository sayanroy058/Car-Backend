-- Migration 001: Initial schema for DriveHub
-- Creates all tables, indexes, and relationships

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password TEXT
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL,
  sellerName TEXT NOT NULL,
  sellerEmail TEXT NOT NULL,
  sellerPhone TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  year INTEGER NOT NULL,
  registrationYear INTEGER NOT NULL,
  fuelType TEXT NOT NULL,
  transmission TEXT NOT NULL,
  kmDriven INTEGER NOT NULL,
  ownership TEXT NOT NULL,
  registrationState TEXT NOT NULL,
  registrationCity TEXT NOT NULL,
  vin TEXT NOT NULL,
  insuranceStatus TEXT NOT NULL,
  roadTaxStatus TEXT NOT NULL,
  serviceHistory TEXT NOT NULL,
  accidentHistory TEXT NOT NULL,
  keys INTEGER NOT NULL,
  exteriorCondition TEXT NOT NULL,
  interiorCondition TEXT NOT NULL,
  engineCondition TEXT NOT NULL,
  tireCondition TEXT NOT NULL,
  batteryCondition TEXT NOT NULL,
  defects TEXT NOT NULL,
  modifications TEXT NOT NULL,
  description TEXT NOT NULL,
  expectedPrice INTEGER NOT NULL,
  address TEXT NOT NULL,
  preferredContactTime TEXT NOT NULL,
  bodyType TEXT NOT NULL,
  images TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  pricing TEXT,
  createdAt INTEGER NOT NULL,
  views INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL,
  buyerId TEXT,
  buyerName TEXT NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  counterAmount INTEGER,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (listingId) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL,
  userId TEXT NOT NULL,
  buyerName TEXT NOT NULL,
  buyerEmail TEXT NOT NULL,
  buyerPhone TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reserveFee INTEGER,
  tenure INTEGER,
  downPayment INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt INTEGER NOT NULL,
  scheduledDate TEXT,
  city TEXT,
  FOREIGN KEY (listingId) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (listingId) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  sellerId TEXT NOT NULL,
  sellerName TEXT NOT NULL,
  listingTitle TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastReadAt TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  senderName TEXT NOT NULL,
  text TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  mine INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT NOT NULL,
  filters TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist (
  userId TEXT NOT NULL,
  listingId TEXT NOT NULL,
  PRIMARY KEY (userId, listingId)
);

CREATE TABLE IF NOT EXISTS compare_items (
  userId TEXT NOT NULL,
  listingId TEXT NOT NULL,
  PRIMARY KEY (userId, listingId)
);

CREATE TABLE IF NOT EXISTS recently_viewed (
  userId TEXT NOT NULL,
  listingId TEXT NOT NULL,
  viewedAt INTEGER NOT NULL,
  PRIMARY KEY (userId, listingId)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_brand ON listings(brand);
CREATE INDEX IF NOT EXISTS idx_listings_bodyType ON listings(bodyType);
CREATE INDEX IF NOT EXISTS idx_listings_fuelType ON listings(fuelType);
CREATE INDEX IF NOT EXISTS idx_listings_transmission ON listings(transmission);
CREATE INDEX IF NOT EXISTS idx_listings_createdAt ON listings(createdAt);
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_offers_listingId ON offers(listingId);
CREATE INDEX IF NOT EXISTS idx_reviews_listingId ON reviews(listingId);
CREATE INDEX IF NOT EXISTS idx_bookings_userId ON bookings(userId);
CREATE INDEX IF NOT EXISTS idx_tickets_userId ON tickets(userId);
