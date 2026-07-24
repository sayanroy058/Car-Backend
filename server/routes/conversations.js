import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/conversations
router.get("/", (req, res) => {
  const db = getDb();
  const all = req.query.all === "true";
  const userId = req.query.userId;

  if (!all && !userId) {
    res.status(400).json({ error: "userId query parameter required" });
    return;
  }

  const rows = all
    ? db.prepare("SELECT * FROM conversations ORDER BY createdAt DESC").all()
    : db.prepare("SELECT * FROM conversations WHERE buyerId = ? ORDER BY createdAt DESC").all(userId);

  const conversations = rows.map((c) => {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id);
    const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : undefined;
    return { ...c, messages, lastReadAt };
  });

  res.json({ conversations });
});

// GET /api/conversations/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id);
  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : undefined;
  res.json({ conversation: { ...c, messages, lastReadAt } });
});

// POST /api/conversations
router.post("/", (req, res) => {
  const db = getDb();
  const { listingId, buyerId, sellerId, sellerName, listingTitle } = req.body;

  if (!listingId || !buyerId || !sellerId) {
    res.status(400).json({ error: "listingId, buyerId, and sellerId are required" });
    return;
  }

  // Check for existing conversation
  const existing = db.prepare(
    "SELECT * FROM conversations WHERE listingId = ? AND buyerId = ?"
  ).get(listingId, buyerId);

  if (existing) {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(existing.id);
    res.json({ conversation: { ...existing, messages, lastReadAt: existing.lastReadAt ? JSON.parse(existing.lastReadAt) : undefined } });
    return;
  }

  const id = `c-${Date.now()}`;
  db.prepare(
    "INSERT INTO conversations (id, listingId, buyerId, sellerId, sellerName, listingTitle, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, listingId, buyerId, sellerId, sellerName ?? "", listingTitle ?? "", Date.now());

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
  res.status(201).json({ conversation: { ...c, messages: [] } });
});

// POST /api/conversations/:id/messages
router.post("/:id/messages", (req, res) => {
  const db = getDb();
  const conversationId = req.params.id;
  const { senderId, senderName, text, mine } = req.body;

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const id = `m-${Date.now()}`;
  db.prepare(
    "INSERT INTO messages (id, conversationId, senderId, senderName, text, createdAt, mine) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, conversationId, senderId ?? "", senderName ?? "", text, Date.now(), mine ? 1 : 0);

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  res.status(201).json({ message });
});

// POST /api/conversations/:id/read
router.post("/:id/read", (req, res) => {
  const db = getDb();
  const conversationId = req.params.id;
  const userId = req.body.userId;

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : {};
  lastReadAt[userId] = Date.now();

  db.prepare("UPDATE conversations SET lastReadAt = ? WHERE id = ?").run(JSON.stringify(lastReadAt), conversationId);
  res.json({ success: true });
});

export default router;
