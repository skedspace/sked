"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCode } from "@/lib/discounts";

type PromotionInput = {
  id?: string;
  orgId: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  valuePercent?: number;
  valueCents?: number;
  maxUses?: number | null;
  minCents?: number | null;
  maxDiscountCents?: number | null;
  startsAt: string;
  expiresAt?: string | null;
  isActive: boolean;
};

type ActionResult = {
  ok: boolean;
  error?: string;
};

function cleanCode(value: string) {
  const code = value.trim() || generateCode();
  return code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

function isoDate(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function payload(input: PromotionInput) {
  const code = cleanCode(input.code);
  const startsAt = isoDate(input.startsAt);
  const expiresAt = isoDate(input.expiresAt, true);
  if (!input.orgId) return { error: "Choose an organization." };
  if (code.length < 3) return { error: "Promotion code must be at least 3 characters." };
  if (!startsAt) return { error: "Choose a valid start date." };
  if (input.type === "percentage" && (!input.valuePercent || input.valuePercent < 1 || input.valuePercent > 100)) {
    return { error: "Percentage discounts must be between 1 and 100." };
  }
  if (input.type === "fixed" && (!input.valueCents || input.valueCents < 100)) {
    return { error: "Fixed discounts must be at least ₱1.00." };
  }
  return {
    data: {
      org_id: input.orgId,
      code,
      type: input.type,
      description: input.description.trim() || null,
      value_percent: input.type === "percentage" ? Math.round(input.valuePercent ?? 0) : null,
      value_cents: input.type === "fixed" ? Math.round(input.valueCents ?? 0) : null,
      max_uses: input.maxUses && input.maxUses > 0 ? Math.round(input.maxUses) : null,
      min_cents: input.minCents && input.minCents > 0 ? Math.round(input.minCents) : null,
      max_discount_cents: input.maxDiscountCents && input.maxDiscountCents > 0 ? Math.round(input.maxDiscountCents) : null,
      starts_at: startsAt,
      expires_at: expiresAt,
      is_active: input.isActive,
    },
  };
}

function refreshPromotions() {
  revalidatePath("/admin");
  revalidatePath("/admin/promotions");
}

export async function saveAdminPromotionAction(input: PromotionInput): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = payload(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = createAdminClient();
  const result = input.id
    ? await supabase.from("discount_codes").update(parsed.data).eq("id", input.id)
    : await supabase.from("discount_codes").insert(parsed.data);

  if (result.error) {
    if (result.error.message?.toLowerCase().includes("unique") || result.error.code === "23505") {
      return { ok: false, error: "A promotion with this code already exists for that organization." };
    }
    return { ok: false, error: result.error.message };
  }

  refreshPromotions();
  return { ok: true };
}

export async function toggleAdminPromotionAction(id: string, isActive: boolean): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("discount_codes").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refreshPromotions();
  return { ok: true };
}

export async function deleteAdminPromotionAction(id: string): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refreshPromotions();
  return { ok: true };
}
