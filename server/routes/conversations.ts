import { Router, type Request, type Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/conversations
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const all = req.query.all === "true";
  const userId = req.query.userId as string | undefined;

  if (!all && !userId) {
    res.status(400).json({ error: "userId query parameter required" });
    return;
  }

  const rows = all
    ? (db.prepare("SELECT * FROM conversations ORDER BY createdAt DESC").all() as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM conversations WHERE buyerId = ? ORDER BY createdAt DESC").all(userId) as Record<string, unknown>[]);

  const conversations = rows.map((c) => {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id) as Record<string, unknown>[];
    const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt as string) : undefined;
    return { ...c, messages, lastReadAt };
  });

  res.json({ conversations });
});

// GET /api/conversations/:id
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(c.id) as Record<string, unknown>[];
  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt as string) : undefined;
  res.json({ conversation: { ...c, messages, lastReadAt } });
});

// POST /api/conversations
router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const { listingId, buyerId, sellerId, sellerName, listingTitle } = req.body;

  if (!listingId || !buyerId || !sellerId) {
    res.status(400).json({ error: "listingId, buyerId, and sellerId are required" });
    return;
  }

  // Check for existing conversation
  const existing = db.prepare(
    "SELECT * FROM conversations WHERE listingId = ? AND buyerId = ?"
  ).get(listingId, buyerId) as Record<string, unknown> | undefined;

  if (existing) {
    const messages = db.prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC").all(existing.id) as Record<string, unknown>[];
    res.json({ conversation: { ...existing, messages, lastReadAt: existing.lastReadAt ? JSON.parse(existing.lastReadAt as string) : undefined } });
    return;
  }

  const id = `c-${Date.now()}`;
  db.prepare(
    "INSERT INTO conversations (id, listingId, buyerId, sellerId, sellerName, listingTitle, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, listingId, buyerId, sellerId, sellerName ?? "", listingTitle ?? "", Date.now());

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json({ conversation: { ...c, messages: [] } });
});

// POST /api/conversations/:id/messages
router.post("/:id/messages", (req: Request, res: Response) => {
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
router.post("/:id/read", (req: Request, res: Response) => {
  const db = getDb();
  const conversationId = req.params.id;
  const userId = req.body.userId as string;

  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Record<string, unknown> | undefined;
  if (!c) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const lastReadAt = c.lastReadAt ? JSON.parse(c.lastReadAt as string) : {};
  lastReadAt[userId] = Date.now();

  db.prepare("UPDATE conversations SET lastReadAt = ? WHERE id = ?").run(JSON.stringify(lastReadAt), conversationId);
  res.json({ success: true });
});

export default router;
