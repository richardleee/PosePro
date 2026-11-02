import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";
import { store } from "../db/store.js";
import { tierFromSub } from "../db/types.js";
import { isProTier, type PlanTier } from "@framecoach/shared";

export interface AuthedRequest extends Request {
  userId: string;
  email: string;
  tier: PlanTier;
}

export function signToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, env.jwtSecret, { expiresIn: "30d" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; email: string };
    const user = await store.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: "Account not found" });
    const sub = await store.getSub(user.id);
    (req as AuthedRequest).userId = user.id;
    (req as AuthedRequest).email = user.email;
    (req as AuthedRequest).tier = tierFromSub(sub);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

export function requirePro(req: Request, res: Response, next: NextFunction) {
  const tier = (req as AuthedRequest).tier;
  if (!isProTier(tier)) {
    return res.status(402).json({ error: "Pro subscription required", code: "upgrade_required" });
  }
  next();
}
