import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { getDb, closeDb } from "./db.js";
import { seed } from "./seed.js";
import { requireAuth, optionalAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import offerRoutes from "./routes/offers.js";
import bookingRoutes from "./routes/bookings.js";
import ticketRoutes from "./routes/tickets.js";
import reviewRoutes from "./routes/reviews.js";
import conversationRoutes from "./routes/conversations.js";
import savedSearchRoutes from "./routes/saved-searches.js";
import wishlistRoutes from "./routes/wishlist.js";
import uploadRoutes from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ── Static files (uploaded images) ──
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Public routes (no auth required) ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
app.use("/api/auth", authRoutes);
app.use("/api/upload", requireAuth, uploadRoutes);

// ── Initialize DB and seed ──
const db = getDb();
seed();

// ── Protected routes ──
app.use("/api/listings", optionalAuth, listingRoutes);
app.use("/api/offers", requireAuth, offerRoutes);
app.use("/api/bookings", requireAuth, bookingRoutes);
app.use("/api/tickets", requireAuth, ticketRoutes);
app.use("/api/reviews", reviewRoutes); // GET is public, POST is auth-protected within router
app.use("/api/conversations", requireAuth, conversationRoutes);
app.use("/api/saved-searches", requireAuth, savedSearchRoutes);
app.use("/api/wishlist", requireAuth, wishlistRoutes);

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Graceful shutdown ──
process.on("SIGINT", () => {
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDb();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served from http://localhost:${PORT}/uploads`);
});

export { app };
