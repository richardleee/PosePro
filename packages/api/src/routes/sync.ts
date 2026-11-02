import { Router } from "express";
import { isProTier } from "@framecoach/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { store } from "../db/store.js";

export const syncRouter = Router();

syncRouter.put("/profiles", requireAuth, async (req, res) => {
  const { userId, tier } = req as AuthedRequest;
  if (!isProTier(tier)) {
    return res.status(402).json({ error: "Cloud backup is a Pro feature", code: "upgrade_required" });
  }
  if (!req.body?.confirmed) {
    return res.status(400).json({ error: "Cloud backup requires an explicit second confirmation" });
  }
  const ciphertext = String(req.body?.ciphertext || "");
  if (!ciphertext) return res.status(400).json({ error: "Encrypted preference payload required" });
  if (typeof req.body?.image !== "undefined") {
    return res.status(400).json({ error: "Face photos and destination images are not stored in the cloud" });
  }
  await store.putSync(userId, ciphertext);
  res.json({ ok: true });
});

syncRouter.get("/profiles", requireAuth, async (req, res) => {
  const { userId, tier } = req as AuthedRequest;
  if (!isProTier(tier)) return res.status(402).json({ error: "Cloud backup is a Pro feature", code: "upgrade_required" });
  const row = await store.getSync(userId);
  res.json({ ciphertext: row?.ciphertext ?? null, updatedAt: row?.updated_at ?? null });
});
