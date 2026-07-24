import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { getDb, closeDb } from "./db";
import { seed } from "./seed";
import { requireAuth, optionalAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import listingRoutes from "./routes/listings";
import offerRoutes from "./routes/offers";
import bookingRoutes from "./routes/bookings";
import ticketRoutes from "./routes/tickets";
import reviewRoutes from "./routes/reviews";
import conversationRoutes from "./routes/conversations";
import savedSearchRoutes from "./routes/saved-searches";
import wishlistRoutes from "./routes/wishlist";
import uploadRoutes from "./routes/upload";

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
app.use("/api/upload", requireAuth as express.RequestHandler, uploadRoutes);

// ── Initialize DB and seed ──
const db = getDb();
seed();

// ── Protected routes ──
app.use("/api/listings", optionalAuth as express.RequestHandler, listingRoutes);
app.use("/api/offers", requireAuth as express.RequestHandler, offerRoutes);
app.use("/api/bookings", requireAuth as express.RequestHandler, bookingRoutes);
app.use("/api/tickets", requireAuth as express.RequestHandler, ticketRoutes);
app.use("/api/reviews", reviewRoutes); // GET is public, POST is auth-protected within router
app.use("/api/conversations", requireAuth as express.RequestHandler, conversationRoutes);
app.use("/api/saved-searches", requireAuth as express.RequestHandler, savedSearchRoutes);
app.use("/api/wishlist", requireAuth as express.RequestHandler, wishlistRoutes);

// ── Global error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
