/**
 * SKED pricing plan definitions.
 *
 * Plans: Trial (14-day free trial) → Monthly (₱1,299/mo, all features).
 * The monthly price can be overridden via the admin panel (app_config table).
 *
 * When changing limits here, also update the database constraints
 * in:
 *   supabase/migrations/00010_create_plans_and_subscriptions.sql
 *   supabase/migrations/00036_create_app_config.sql
 */

export type PlanId = "trial" | "monthly";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyCents: number;
  description: string;
  highlights: string[];
  bookingLimitMonthly: number;
  resourceLimit: number;
  /** Duration in days for trial plans */
  trialDays?: number;
}

export const DEFAULT_MONTHLY_PRICE_CENTS = 129900; // ₱1,299

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    priceMonthlyCents: 0,
    description: "14-day free trial. No card required.",
    highlights: [
      "Unlimited bookings during trial",
      "Unlimited resources",
      "All features included",
      "Email support",
    ],
    bookingLimitMonthly: 99999,
    resourceLimit: 999,
    trialDays: 14,
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    priceMonthlyCents: DEFAULT_MONTHLY_PRICE_CENTS, // ₱1,299 — overridable via admin
    description: "Full access for your business",
    highlights: [
      "Unlimited bookings",
      "Unlimited resources",
      "Multiple locations",
      "Team accounts",
      "Advanced analytics",
      "API access",
      "Priority support",
    ],
    bookingLimitMonthly: 99999,
    resourceLimit: 999,
  },
};

/**
 * Returns the plan configuration for a given plan id.
 * Defaults to "trial" if the plan is unknown.
 */
export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.trial;
}
