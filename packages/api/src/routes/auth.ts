import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { hashPassword, verifyPassword } from "../db/memory.js";
import { store } from "../db/store.js";
import { signToken, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../env.js";
import { tierFromSub } from "../db/types.js";
import { PRICING } from "@framecoach/shared";

export const authRouter = Router();
const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

authRouter.post("/signup", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and a password of at least 8 characters are required" });
  }
  if (await store.findUserByEmail(email)) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }
  const user = await store.createUser(email, await hashPassword(password), null);
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, tier: "free" }, pricing: PRICING });
});

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = await store.findUserByEmail(email);
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const sub = await store.getSub(user.id);
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, tier: tierFromSub(sub) } });
});

authRouter.post("/google", async (req, res) => {
  if (!googleClient) return res.status(501).json({ error: "Google sign-in is not configured" });
  const credential = String(req.body?.credential || "");
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) return res.status(401).json({ error: "Google sign-in failed" });
    let user = await store.findUserByGoogle(payload.sub);
    if (!user) user = await store.findUserByEmail(payload.email);
    if (!user) user = await store.createUser(payload.email, null, payload.sub);
    const sub = await store.getSub(user.id);
    res.json({
      token: signToken(user.id, user.email),
      user: { id: user.id, email: user.email, tier: tierFromSub(sub) },
    });
  } catch {
    res.status(401).json({ error: "Google sign-in failed" });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { userId, email, tier } = req as AuthedRequest;
  const sub = await store.getSub(userId);
  const utcDate = new Date().toISOString().slice(0, 10);
  const plannerCount = await store.getUsage(userId, utcDate);
  res.json({
    user: { id: userId, email, tier },
    subscription: sub,
    usage: { utcDate, plannerCount },
    pricing: PRICING,
  });
});
