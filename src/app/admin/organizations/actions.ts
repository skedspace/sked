"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = {
  ok: boolean;
  error?: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

export async function createOrganizationAction(input: {
  name: string;
  slug?: string;
  plan: "trial" | "premium";
  contactEmail?: string;
  contactPhone?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const slug = slugify(input.slug || name);

  if (name.length < 2) return { ok: false, error: "Organization name is required." };
  if (slug.length < 2) return { ok: false, error: "Enter a valid organization slug." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return { ok: false, error: "That organization slug is already in use." };

  const isTrial = input.plan === "trial";
  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      plan: isTrial ? "free" : "pro",
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !organization) {
    return { ok: false, error: error?.message || "Unable to create the organization." };
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + (isTrial ? 14 : 30));
  const { error: subscriptionError } = await supabase.from("subscriptions").insert({
    org_id: organization.id,
    plan: isTrial ? "trial" : "monthly",
    status: "active",
    current_period_end: periodEnd.toISOString(),
  });

  if (subscriptionError) {
    await supabase.from("organizations").delete().eq("id", organization.id);
    return { ok: false, error: subscriptionError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  return { ok: true };
}

export async function updateOrganizationStatusAction(
  organizationId: string,
  status: "active" | "past_due" | "churned",
): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const { data: subscription, error: lookupError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("org_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };

  const subscriptionStatus = status === "churned" ? "canceled" : status;
  if (subscription) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscriptionStatus,
        canceled_at: status === "churned" ? new Date().toISOString() : null,
      })
      .eq("id", subscription.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    const { error } = await supabase.from("subscriptions").insert({
      org_id: organizationId,
      plan: "monthly",
      status: subscriptionStatus,
      current_period_end: periodEnd.toISOString(),
      canceled_at: status === "churned" ? new Date().toISOString() : null,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  return { ok: true };
}
