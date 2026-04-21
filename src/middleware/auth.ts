import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { User } from "../models/index.js";
import type { IUserDoc } from "../types/express.js";

const JWT_SECRET = env.JWT_SECRET;

/** Optional auth: sets req.user if valid JWT. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (user) req.user = user.toObject() as IUserDoc;
    }
  } catch {
    // ignore invalid token
  }
  next();
}

/** Require auth; 401 if not authenticated. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/** True if the loaded user has admin role (JWT must be refreshed after role change). */
export function isAdminUser(user: IUserDoc | undefined): boolean {
  return user?.role === "admin";
}

/** Require authenticated admin; 403 otherwise. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminUser(req.user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
