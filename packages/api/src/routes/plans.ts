import { Router } from "express";
import { matchShots, effectiveLimits, type SceneTag, type ProfileTags } from "@framecoach/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { store } from "../db/store.js";

export const plansRouter = Router();

plansRouter.post("/generate", requireAuth, async (req, res) => {
  const { userId, tier } = req as AuthedRequest;
  const limits = effectiveLimits(tier);
  const utcDate = new Date().toISOString().slice(0, 10);
  const used = await store.getUsage(userId, utcDate);
  if (used >= limits.maxPlannerGenerationsPerDay) {
    return res.status(402).json({
      error: "Daily planner limit reached on the Free plan. Upgrade to Pro for unlimited shot lists.",
      code: "upgrade_required",
    });
  }

  const scene = req.body?.scene as SceneTag;
  const couple = Boolean(req.body?.couple);
  const tags = req.body?.tags as ProfileTags;
  if (!scene || !tags) return res.status(400).json({ error: "scene and profile tags are required" });

  const shots = matchShots({ scene, tags, couple });
  if (shots.length < 3) {
    return res.status(422).json({ error: "Not enough matching templates for this scene and preferences" });
  }

  await store.bumpUsage(userId, utcDate);
  res.json({ shots, usage: { utcDate, plannerCount: used + 1 } });
});
