import { Router } from "express";
import { PRICING } from "@framecoach/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { store } from "../db/store.js";
import { env } from "../env.js";
import { stripe, stripeConfigured } from "../services/stripeClient.js";
import type Stripe from "stripe";

export const billingRouter = Router();

billingRouter.post("/checkout", requireAuth, async (req, res) => {
  const { userId, email } = req as AuthedRequest;
  const interval = req.body?.interval === "year" ? "year" : "month";
  if (!stripeConfigured() || !stripe) {
    const sub = await store.getSub(userId);
    await store.upsertSub({
      user_id: userId,
      stripe_customer_id: sub?.stripe_customer_id ?? "demo_cus",
      stripe_subscription_id: "demo_sub",
      status: "trialing",
      price_interval: interval,
      trial_end: new Date(Date.now() + PRICING.trialDays * 86400000).toISOString(),
      current_period_end: new Date(Date.now() + PRICING.trialDays * 86400000).toISOString(),
    });
    return res.json({
      demo: true,
      url: `${env.webOrigin}/app/account?checkout=demo-trial`,
      message: "Stripe keys are not set. Started a local 7-day Pro trial for demo.",
    });
  }

  const existing = await store.getSub(userId);
  let customerId = existing?.stripe_customer_id || undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await store.upsertSub({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: existing?.stripe_subscription_id ?? null,
      status: existing?.status ?? "free",
      price_interval: existing?.price_interval ?? null,
      trial_end: existing?.trial_end ?? null,
      current_period_end: existing?.current_period_end ?? null,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: interval === "year" ? env.stripePriceYearly : env.stripePriceMonthly,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: PRICING.trialDays,
      metadata: { userId },
    },
    success_url: `${env.webOrigin}/app/account?checkout=success`,
    cancel_url: `${env.webOrigin}/app/account?checkout=cancel`,
    allow_promotion_codes: true,
  });
  res.json({ url: session.url });
});

billingRouter.post("/portal", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  if (!stripeConfigured() || !stripe) {
    return res.status(501).json({ error: "Stripe Customer Portal is not configured" });
  }
  const sub = await store.getSub(userId);
  if (!sub?.stripe_customer_id) return res.status(400).json({ error: "No billing customer yet" });
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${env.webOrigin}/app/account`,
  });
  res.json({ url: session.url });
});

export async function handleStripeWebhook(event: Stripe.Event) {
  const obj = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;
  if (event.type.startsWith("customer.subscription.")) {
    const sub = obj as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    const customerId = String(sub.customer);
    let uid = userId;
    if (!uid) {
      // fall through — metadata should be set on checkout
      return;
    }
    const item = sub.items.data[0];
    const interval = item?.price?.recurring?.interval === "year" ? "year" : "month";
    await store.upsertSub({
      user_id: uid,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status === "trialing" || sub.status === "active" ? sub.status : "free",
      price_interval: interval,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end
        ? new Date(((sub as Stripe.Subscription & { current_period_end?: number }).current_period_end as number) * 1000).toISOString()
        : null,
    });
  }
}
