/**
 * SKED pricing plan definitions.
 *
 * These limits are enforced server-side (Supabase RPC) and
 * reflected in the UI for transparency.
 *
 * When changing limits here, also update the database constraints
 * in:
 *   supabase/migrations/00010_create_plans_and_subscriptions.sql
 */

export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyCents: number;
  description: string;
  highlights: string[];
  bookingLimitMonthly: number;
  resourceLimit: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyCents: 0,
    description: "Perfect for testing the waters",
    highlights: [
      "Up to 50 bookings per month",
      "Up to 5 resources",
      "Basic public page",
      "Email support",
    ],
    bookingLimitMonthly: 50,
    resourceLimit: 5,
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyCents: 99900, // ₱999
    description: "For growing businesses",
    highlights: [
      "Up to 500 bookings per month",
      "Up to 20 resources",
      "Custom public page theme",
      "Deposit & payment collection",
      "Priority support",
    ],
    bookingLimitMonthly: 500,
    resourceLimit: 20,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 299900, // ₱2,999
    description: "For high-volume operations",
    highlights: [
      "Unlimited bookings",
      "Unlimited resources",
      "Multiple locations",
      "Team accounts",
      "Advanced analytics",
      "API access",
    ],
    bookingLimitMonthly: 99999,
    resourceLimit: 999,
  },
};

/**
 * Returns the plan configuration for a given plan id.
 * Defaults to "free" if the plan is unknown.
 */
export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.free;
}
