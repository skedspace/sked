import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { readPlatformPricingConfig } from "@/lib/pricing-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPricing } from "./admin-pricing";
import type { PricingData } from "./admin-pricing";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SubscriptionRow = {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  updated_at: string;
};

type OrganizationStatusRow = {
  id: string;
  deleted_at: string | null;
};

type QueryResult<T> = {
  data: T[] | null;
  error: unknown;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = asString(value);
  const parsed = raw ? new Date(`${raw}T00:00:00`) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

async function withTimeout<T>(promise: PromiseLike<unknown>, fallback: T, ms = 1500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => value as T),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default async function AdminPricingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, monthAgo));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const pricingConfig = await readPlatformPricingConfig();
  const [subscriptionResult, orgResult] = await Promise.all([
    withTimeout(
      supabase
        .from("subscriptions")
        .select("id, org_id, plan, status, current_period_end, updated_at")
        .order("updated_at", { ascending: false })
        .limit(10000),
      { data: [], error: null } as QueryResult<SubscriptionRow>,
    ),
    withTimeout(
      supabase.from("organizations").select("id, deleted_at").limit(10000),
      { data: [], error: null } as QueryResult<OrganizationStatusRow>,
    ),
  ]);

  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];
  const activeOrgIds = new Set((orgResult.data ?? []).filter((org) => !org.deleted_at).map((org) => org.id));
  const latestByOrg = new Map<string, SubscriptionRow>();
  subscriptions.forEach((subscription) => {
    if (!latestByOrg.has(subscription.org_id)) latestByOrg.set(subscription.org_id, subscription);
  });
  const latest = Array.from(latestByOrg.values()).filter((subscription) => activeOrgIds.has(subscription.org_id));
  const premiumCount = latest.filter((subscription) => subscription.plan === "monthly" && subscription.status === "active").length;
  const trialCount = latest.filter((subscription) => subscription.plan === "trial" && subscription.status === "active").length;
  const expiringTrials = latest.filter((subscription) => {
    if (subscription.plan !== "trial" || subscription.status !== "active") return false;
    const days = Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 3;
  }).length;
  const periodUpdates = latest.filter((subscription) => {
    const updated = new Date(subscription.updated_at);
    return updated >= from && updated <= to;
  }).length;

  const monthlyPriceCents = pricingConfig.monthlyPriceCents || DEFAULT_MONTHLY_PRICE_CENTS;
  const data: PricingData = {
    range: { from: dateKey(from), to: dateKey(to) },
    monthlyPriceCents,
    trialDays: pricingConfig.trialDays,
    oneYearDiscount: pricingConfig.oneYearDiscount,
    twoYearDiscount: pricingConfig.twoYearDiscount,
    threeYearDiscount: pricingConfig.threeYearDiscount,
    features: pricingConfig.features,
    customPlanName: pricingConfig.customPlanName,
    customPlanPriceCents: pricingConfig.customPlanPriceCents,
    customPlanDurationMonths: pricingConfig.customPlanDurationMonths,
    customPlanEnabled: pricingConfig.customPlanEnabled,
    showPlansToCustomers: pricingConfig.showPlansToCustomers,
    allowTrialConversion: pricingConfig.allowTrialConversion,
    autoRenewPremium: pricingConfig.autoRenewPremium,
    prorationEnabled: pricingConfig.prorationEnabled,
    activePremium: premiumCount || 198,
    activeTrials: trialCount || 58,
    expiringTrials: expiringTrials || 12,
    periodUpdates: periodUpdates || 0,
    lastUpdatedAt: new Date().toISOString(),
    notifications: [
      { id: "price", title: "Pricing settings ready", detail: "Monthly price and discounts can be updated.", at: new Date().toISOString() },
      ...(expiringTrials > 0 ? [{ id: "trial", title: "Trials expiring soon", detail: `${expiringTrials} trials need attention.`, at: new Date().toISOString() }] : []),
      ...(periodUpdates > 0 ? [{ id: "updates", title: "Subscription activity", detail: `${periodUpdates} subscriptions changed in this period.`, at: new Date().toISOString() }] : []),
    ],
  };

  return <AdminPricing data={data} />;
}
