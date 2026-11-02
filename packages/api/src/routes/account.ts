import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { store } from "../db/store.js";

export const accountRouter = Router();

accountRouter.post("/erase", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  if (req.body?.confirm !== "DELETE") {
    return res.status(400).json({ error: "Type DELETE to confirm erasure" });
  }
  await store.deleteUserData(userId);
  res.json({
    ok: true,
    message: "Local and cloud preference data for this account has been queued. Cleanup completes within 30 days.",
  });
});
