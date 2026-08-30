import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/conversations — the caller's conversations; admins see all.
router.get("/", (req, res) => {
  const db = getDb();
  const isAdmin = req.userRole === "admin";

  const rows = isAdmin
    ? db.prepare("SELECT * FROM conversations ORDER BY createdAt DESC").all()
    : db
        .prepare(
          "SELECT * FROM conversations WHERE buyerId = ? OR sellerId = ? ORDER BY createdAt DESC",
        )
        .all(req.userId, req.userId);

  const conversations = rows.map((c) => {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id);
    const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : undefined;
    return { ...c, messages, lastReadAt };
  });

  res.json({ conversations });
});

/** True when the caller is a participant in the conversation, or an admin. */
function canAccess(req, conversation) {
  return (
    req.userRole === "admin" ||
    conversation.buyerId === req.userId ||
    conversation.sellerId === req.userId
  );
}

// GET /api/conversations/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (!canAccess(req, c)) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id);
  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : undefined;
  res.json({ conversation: { ...c, messages, lastReadAt } });
});

// POST /api/conversations — the caller is always the buyer.
router.post("/", (req, res) => {
  const db = getDb();
  const { listingId, sellerId, sellerName, listingTitle } = req.body;

  if (!listingId || !sellerId) {
    res.status(400).json({ error: "listingId and sellerId are required" });
    return;
  }

  // Reuse the existing thread for this buyer/listing pair.
  const existing = db.prepare(
    "SELECT * FROM conversations WHERE listingId = ? AND buyerId = ?"
  ).get(listingId, req.userId);

  if (existing) {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(existing.id);
    res.json({ conversation: { ...existing, messages, lastReadAt: existing.lastReadAt ? JSON.parse(existing.lastReadAt) : undefined } });
    return;
  }

  const id = `c-${Date.now()}`;
  db.prepare(
    "INSERT INTO conversations (id, listingId, buyerId, sellerId, sellerName, listingTitle, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, listingId, req.userId, sellerId, sellerName ?? "", listingTitle ?? "", Date.now());

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
  res.status(201).json({ conversation: { ...c, messages: [] } });
});

// POST /api/conversations/:id/messages — sender is the authenticated caller.
router.post("/:id/messages", (req, res) => {
  const db = getDb();
  const conversationId = req.params.id;
  const { senderName, text } = req.body;

  if (!text || !String(text).trim()) {
    res.status(400).json({ error: "Message text is required" });
    return;
  }

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (!canAccess(req, c)) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const id = `m-${Date.now()}`;
  // `mine` is a per-viewer notion, so it is not persisted from the client;
  // clients compare senderId against the signed-in user instead.
  db.prepare(
    "INSERT INTO messages (id, conversationId, senderId, senderName, text, createdAt, mine) VALUES (?, ?, ?, ?, ?, ?, 0)"
  ).run(id, conversationId, req.userId, senderName ?? "", text, Date.now());

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  res.status(201).json({ message });
});

// POST /api/conversations/:id/read — marks read for the calling user only.
router.post("/:id/read", (req, res) => {
  const db = getDb();
  const conversationId = req.params.id;

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (!canAccess(req, c)) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt) : {};
  lastReadAt[req.userId] = Date.now();

  db.prepare("UPDATE conversations SET lastReadAt = ? WHERE id = ?").run(JSON.stringify(lastReadAt), conversationId);
  res.json({ success: true });
});

export default router;
