import type { PlanTier } from "@framecoach/shared";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
}

export interface SubRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_interval: string | null;
  trial_end: string | null;
  current_period_end: string | null;
}

export function tierFromSub(sub: SubRow | null): PlanTier {
  if (!sub) return "free";
  if (sub.status === "trialing") return "trialing";
  if (sub.status === "active") return "pro";
  return "free";
}
