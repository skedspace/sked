import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformPricingConfig = {
  monthlyPriceCents: number;
  trialDays: number;
  oneYearDiscount: number;
  twoYearDiscount: number;
  threeYearDiscount: number;
  features: string[];
  customPlanName: string;
  customPlanPriceCents: number;
  customPlanDurationMonths: number;
  customPlanEnabled: boolean;
  showPlansToCustomers: boolean;
  allowTrialConversion: boolean;
  autoRenewPremium: boolean;
  prorationEnabled: boolean;
};

const legacyDefaultPremiumFeatures = [
  "Unlimited court bookings",
  "Real-time availability",
  "Automated scheduling",
  "Member management",
  "Reports & analytics",
  "Email & SMS notifications",
  "Priority support",
  "Multi-location management",
  "Custom booking rules",
  "API access",
];

const detailedDefaultPremiumFeatures = [
  "Mobile-first public booking page with custom branding",
  "Real-time court and service availability",
  "Bookings that respect hours, buffers, notice periods, and existing reservations",
  "Manual dashboard bookings for walk-ins and phone reservations",
  "Customer and player records with booking history and no-show tracking",
  "Organization-owned payment instructions for GCash QR, bank transfer, cash, or other manual methods",
  "Booking calendar, list views, payment history, and reporting dashboards",
  "Locations, courts/resources, services, operating hours, and holiday overrides",
  "Waitlists, recurring bookings, packages, discounts, and campaigns",
  "Embeddable booking widget and Google Calendar sync",
];

export const defaultPremiumFeatures = [
  "Own your custom business page name",
  "Custom public page with built-in booking",
  "Interactive Daily Sessions dashboard",
  "Live Gameboard monitoring page",
  "Court, service, and operating-hour setup",
  "Customer records with booking history",
  "Payments, deposits, and payment history",
  "Waitlists, packages, discounts, and campaigns",
  "Google Calendar sync and embed widget",
  "Reports for bookings, revenue, and court activity",
];

const defaultConfig: PlatformPricingConfig = {
  monthlyPriceCents: DEFAULT_MONTHLY_PRICE_CENTS,
  trialDays: 14,
  oneYearDiscount: 17,
  twoYearDiscount: 25,
  threeYearDiscount: 33,
  features: defaultPremiumFeatures,
  customPlanName: "Custom Premium",
  customPlanPriceCents: DEFAULT_MONTHLY_PRICE_CENTS * 6,
  customPlanDurationMonths: 6,
  customPlanEnabled: false,
  showPlansToCustomers: true,
  allowTrialConversion: true,
  autoRenewPremium: true,
  prorationEnabled: false,
};

let devConfig: PlatformPricingConfig = defaultConfig;
const localConfigPath = path.join(process.cwd(), ".next", "cache", "platform-pricing-config.json");

const configKeys: Record<keyof PlatformPricingConfig, string> = {
  monthlyPriceCents: "monthly_price_cents",
  trialDays: "trial_days",
  oneYearDiscount: "annual_discount_1_year",
  twoYearDiscount: "annual_discount_2_year",
  threeYearDiscount: "annual_discount_3_year",
  features: "premium_features",
  customPlanName: "custom_plan_name",
  customPlanPriceCents: "custom_plan_price_cents",
  customPlanDurationMonths: "custom_plan_duration_months",
  customPlanEnabled: "custom_plan_enabled",
  showPlansToCustomers: "show_plans_to_customers",
  allowTrialConversion: "allow_trial_to_premium",
  autoRenewPremium: "auto_renew_premium",
  prorationEnabled: "proration_enabled",
};

const descriptions: Record<keyof PlatformPricingConfig, string> = {
  monthlyPriceCents: "Premium monthly subscription price in cents.",
  trialDays: "Free trial duration in days.",
  oneYearDiscount: "Discount percentage for one-year premium plans.",
  twoYearDiscount: "Discount percentage for two-year premium plans.",
  threeYearDiscount: "Discount percentage for three-year premium plans.",
  features: "Feature list included in premium plans.",
  customPlanName: "Custom premium plan name.",
  customPlanPriceCents: "Custom premium plan price in cents.",
  customPlanDurationMonths: "Custom premium plan duration in months.",
  customPlanEnabled: "Whether the custom premium plan is enabled.",
  showPlansToCustomers: "Whether public pricing plans are visible to customers.",
  allowTrialConversion: "Whether trial organizations can upgrade to premium.",
  autoRenewPremium: "Whether premium subscriptions renew automatically by default.",
  prorationEnabled: "Whether billing changes are prorated.",
};

async function withTimeout<T>(promise: PromiseLike<unknown>, fallback: T, ms = 1200): Promise<T> {
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

function numberValue(config: Record<string, string>, key: string, fallback: number) {
  const value = Number(config[key]);
  return Number.isFinite(value) ? value : fallback;
}

function boolValue(config: Record<string, string>, key: string, fallback: boolean) {
  if (config[key] === "true") return true;
  if (config[key] === "false") return false;
  return fallback;
}

function listValue(config: Record<string, string>, key: string, fallback: string[]) {
  try {
    const parsed = JSON.parse(config[key] || "[]");
    if (Array.isArray(parsed)) {
      const values = parsed.map((item) => String(item).trim()).filter(Boolean);
      if (values.length > 0) return values;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function sameFeatureList(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function normalizePremiumFeatures(features: string[]) {
  return sameFeatureList(features, legacyDefaultPremiumFeatures) ||
    sameFeatureList(features, detailedDefaultPremiumFeatures)
    ? defaultPremiumFeatures
    : features;
}

export function pricingRows(config: PlatformPricingConfig) {
  return (Object.keys(configKeys) as Array<keyof PlatformPricingConfig>).map((key) => ({
    key: configKeys[key],
    value: key === "features" ? JSON.stringify(config[key]) : String(config[key]),
    description: descriptions[key],
  }));
}

export function parsePricingConfig(
  rows: Array<{ key: string; value: string }> | null | undefined,
  fallback: PlatformPricingConfig = defaultConfig,
) {
  const values = Object.fromEntries((rows ?? []).map((row) => [row.key, row.value]));
  return {
    monthlyPriceCents: numberValue(values, "monthly_price_cents", fallback.monthlyPriceCents),
    trialDays: numberValue(values, "trial_days", fallback.trialDays),
    oneYearDiscount: numberValue(values, "annual_discount_1_year", fallback.oneYearDiscount),
    twoYearDiscount: numberValue(values, "annual_discount_2_year", fallback.twoYearDiscount),
    threeYearDiscount: numberValue(values, "annual_discount_3_year", fallback.threeYearDiscount),
    features: normalizePremiumFeatures(listValue(values, "premium_features", fallback.features)),
    customPlanName: values.custom_plan_name || fallback.customPlanName,
    customPlanPriceCents: numberValue(values, "custom_plan_price_cents", fallback.customPlanPriceCents),
    customPlanDurationMonths: numberValue(values, "custom_plan_duration_months", fallback.customPlanDurationMonths),
    customPlanEnabled: boolValue(values, "custom_plan_enabled", fallback.customPlanEnabled),
    showPlansToCustomers: boolValue(values, "show_plans_to_customers", fallback.showPlansToCustomers),
    allowTrialConversion: boolValue(values, "allow_trial_to_premium", fallback.allowTrialConversion),
    autoRenewPremium: boolValue(values, "auto_renew_premium", fallback.autoRenewPremium),
    prorationEnabled: boolValue(values, "proration_enabled", fallback.prorationEnabled),
  };
}

async function readLocalPricingConfig() {
  try {
    const file = await readFile(localConfigPath, "utf8");
    const parsed = JSON.parse(file) as PlatformPricingConfig;
    devConfig = {
      ...defaultConfig,
      ...parsed,
      features: normalizePremiumFeatures(parsed.features?.length ? parsed.features : defaultConfig.features),
    };
  } catch {
    return devConfig;
  }
  return devConfig;
}

async function writeLocalPricingConfig(config: PlatformPricingConfig) {
  await mkdir(path.dirname(localConfigPath), { recursive: true });
  await writeFile(localConfigPath, JSON.stringify(config, null, 2), "utf8");
}

async function writeLocalPricingConfigBestEffort(config: PlatformPricingConfig) {
  try {
    await writeLocalPricingConfig(config);
  } catch {
    // Vercel serverless filesystems can be read-only outside /tmp. Supabase is the source of truth in production.
  }
}

export async function readPlatformPricingConfig() {
  const localConfig = isDevAuthEnabled() ? await readLocalPricingConfig() : defaultConfig;
  if (isDevAuthEnabled()) return localConfig;

  try {
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("app_config").select("key, value"),
      { data: null, error: new Error("Pricing config read timed out.") },
    );
    if (error) throw error;
    const parsed = parsePricingConfig(data, localConfig);
    devConfig = parsed;
    return parsed;
  } catch {
    return readLocalPricingConfig();
  }
}

export async function savePlatformPricingConfig(config: PlatformPricingConfig) {
  devConfig = config;
  if (isDevAuthEnabled()) {
    await writeLocalPricingConfigBestEffort(config);
    return { persisted: true, source: "local" as const };
  }

  try {
    const supabase = createAdminClient();
    for (const row of pricingRows(config)) {
      const { error } = await withTimeout(
        supabase.rpc("set_config", {
          p_key: row.key,
          p_value: row.value,
          p_description: row.description,
        }),
        { data: null, error: new Error("Pricing config save timed out.") },
      );
      if (error) throw error;
    }
    return { persisted: true, source: "database" as const };
  } catch (error) {
    return {
      persisted: false,
      source: "database" as const,
      error: error instanceof Error ? error.message : "Database is unavailable.",
    };
  }
}
