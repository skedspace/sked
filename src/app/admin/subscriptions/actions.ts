"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = {
  ok: boolean;
  error?: string;
};

export async function grantPremiumAction(orgId: string): Promise<ActionResult> {
  if (!orgId) return { ok: false, error: "Organization is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();

  if (orgError) return { ok: false, error: orgError.message };
  if (!organization) return { ok: false, error: "Organization was not found." };

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: existing, error: lookupError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };

  const payload = {
    plan: "monthly",
    status: "active",
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    canceled_at: null,
  };
  const result = existing
    ? await supabase.from("subscriptions").update(payload).eq("id", existing.id)
    : await supabase.from("subscriptions").insert({ org_id: orgId, ...payload });

  if (result.error) return { ok: false, error: result.error.message };

  const orgUpdate = await supabase.from("organizations").update({ plan: "pro" }).eq("id", orgId);
  if (orgUpdate.error) return { ok: false, error: orgUpdate.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/organizations");
  return { ok: true };
}

export async function toggleAutoRenewAction(
  subscriptionId: string,
  autoRenew: boolean,
): Promise<ActionResult> {
  if (!subscriptionId) return { ok: false, error: "Subscription is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const result = await supabase
    .from("subscriptions")
    .update({ canceled_at: autoRenew ? null : new Date().toISOString() })
    .eq("id", subscriptionId);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  return { ok: true };
}

export async function updateSubscriptionStatusAction(
  subscriptionId: string,
  status: "active" | "past_due" | "expired",
): Promise<ActionResult> {
  if (!subscriptionId) return { ok: false, error: "Subscription is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const result = await supabase
    .from("subscriptions")
    .update({
      status,
      canceled_at: status === "expired" ? new Date().toISOString() : null,
    })
    .eq("id", subscriptionId);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/organizations");
  return { ok: true };
}
