import { randomBytes } from "node:crypto";
import { Router } from "express";
import { requireAuth, requirePro, type AuthedRequest } from "../middleware/auth.js";
import { store } from "../db/store.js";
import { env } from "../env.js";

export const shareRouter = Router();

shareRouter.get("/public/:id", async (req, res) => {
  const row = await store.getShare(req.params.id);
  if (!row || row.revoked_at) return res.status(404).json({ error: "This share card is unavailable" });
  res.json({ id: row.id, payload: row.payload });
});

shareRouter.get("/", requireAuth, requirePro, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const rows = await store.listShares(userId);
  res.json({
    cards: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      revokedAt: r.revoked_at,
      url: `${env.webOrigin}/s/${r.id}`,
    })),
  });
});

shareRouter.post("/", requireAuth, requirePro, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const payload = req.body?.payload;
  if (!payload?.profileSummary || !payload?.poses) {
    return res.status(400).json({ error: "payload.profileSummary and payload.poses are required" });
  }
  const id = randomBytes(9).toString("base64url");
  const created_at = new Date().toISOString();
  await store.putShare({ id, user_id: userId, payload, created_at, revoked_at: null });
  res.json({ id, url: `${env.webOrigin}/s/${id}` });
});

shareRouter.post("/:id/revoke", requireAuth, requirePro, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const ok = await store.revokeShare(req.params.id, userId);
  if (!ok) return res.status(404).json({ error: "Card not found" });
  res.json({ ok: true });
});
