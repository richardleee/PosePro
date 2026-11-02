import type { PlanTier } from "./types.js";

export const PRICING = {
  monthlyUsd: 4.99,
  yearlyUsd: 34.99,
  trialDays: 7,
} as const;

export const LIMITS = {
  free: {
    maxSoloProfiles: 1,
    maxCoupleProfiles: 0,
    maxPlannerGenerationsPerDay: 1,
    canShareCards: false,
    canCloudSync: false,
  },
  pro: {
    maxSoloProfiles: 5,
    maxCoupleProfiles: 2,
    maxPlannerGenerationsPerDay: Number.POSITIVE_INFINITY,
    canShareCards: true,
    canCloudSync: true,
  },
} as const;

export function isProTier(tier: PlanTier): boolean {
  return tier === "pro" || tier === "trialing";
}

export function effectiveLimits(tier: PlanTier) {
  return isProTier(tier) ? LIMITS.pro : LIMITS.free;
}
