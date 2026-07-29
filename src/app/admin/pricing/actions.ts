"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { savePlatformPricingConfig, type PlatformPricingConfig } from "@/lib/pricing-config";

type ActionResult = {
  ok: boolean;
  error?: string;
  warning?: string;
};

export async function updatePricingSettingsAction(payload: PlatformPricingConfig): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  if (!Number.isFinite(payload.monthlyPriceCents) || payload.monthlyPriceCents < 0) {
    return { ok: false, error: "Monthly price must be a valid amount." };
  }
  if (!Number.isInteger(payload.trialDays) || payload.trialDays < 1 || payload.trialDays > 60) {
    return { ok: false, error: "Trial duration must be between 1 and 60 days." };
  }
  const discounts = [payload.oneYearDiscount, payload.twoYearDiscount, payload.threeYearDiscount];
  if (discounts.some((discount) => !Number.isFinite(discount) || discount < 0 || discount > 90)) {
    return { ok: false, error: "Discounts must be between 0% and 90%." };
  }
  const features = payload.features.map((feature) => feature.trim()).filter(Boolean);
  if (features.length === 0) return { ok: false, error: "At least one premium feature is required." };
  if (payload.customPlanEnabled) {
    if (!payload.customPlanName.trim()) return { ok: false, error: "Custom plan name is required." };
    if (!Number.isFinite(payload.customPlanPriceCents) || payload.customPlanPriceCents < 0) {
      return { ok: false, error: "Custom plan price must be valid." };
    }
    if (!Number.isInteger(payload.customPlanDurationMonths) || payload.customPlanDurationMonths < 1 || payload.customPlanDurationMonths > 60) {
      return { ok: false, error: "Custom plan duration must be between 1 and 60 months." };
    }
  }

  const result = await savePlatformPricingConfig({ ...payload, features });
  revalidatePath("/admin");
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/");
  revalidatePath("/pricing");

  return result.persisted
    ? { ok: true }
    : { ok: false, error: result.error || "Pricing settings could not be saved to Supabase." };
}
