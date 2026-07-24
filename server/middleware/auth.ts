import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "drivehub-dev-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };
      req.userId = payload.id;
      req.userRole = payload.role;
    } catch {
      // Token invalid — continue without user
    }
  }
  next();
}
