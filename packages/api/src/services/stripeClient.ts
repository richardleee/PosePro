import Stripe from "stripe";
import { env } from "../env.js";

export const stripe = env.stripeSecret
  ? new Stripe(env.stripeSecret)
  : null;

export function stripeConfigured() {
  return Boolean(stripe && env.stripePriceMonthly && env.stripePriceYearly);
}
