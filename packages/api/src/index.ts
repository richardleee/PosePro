import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { initDb } from "./db/store.js";
import { authRouter } from "./routes/auth.js";
import { plansRouter } from "./routes/plans.js";
import { shareRouter } from "./routes/share.js";
import { syncRouter } from "./routes/sync.js";
import { accountRouter } from "./routes/account.js";
import { billingRouter, handleStripeWebhook } from "./routes/billing.js";
import { stripe, stripeConfigured } from "./services/stripeClient.js";

const app = express();
app.use(cors({ origin: env.webOrigin, credentials: true }));

app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripeConfigured() || !stripe) return res.status(501).send("Stripe not configured");
  const sig = req.headers["stripe-signature"];
  if (!sig || !env.stripeWebhookSecret) return res.status(400).send("Missing signature");
  try {
    const event = stripe.webhooks.constructEvent(req.body, String(sig), env.stripeWebhookSecret);
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook error: ${(err as Error).message}`);
  }
});

app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, product: "MusePilot Web Demo" }));
app.use("/api/auth", authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/share", shareRouter);
app.use("/api/sync", syncRouter);
app.use("/api/account", accountRouter);
app.use("/api/billing", billingRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

await initDb();
app.listen(env.port, () => {
  console.log(`[api] MusePilot listening on http://localhost:${env.port}`);
});
