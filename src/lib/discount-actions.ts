"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/discounts";

/**
 * Creates a new discount code for an org.
 */
export async function createDiscountCode(formData: FormData) {
  const supabase = createClient();

  const orgId = formData.get("org_id") as string;
  const code = (formData.get("code") as string || generateCode()).toUpperCase();
  const type = formData.get("type") as "percentage" | "fixed";
  const description = formData.get("description") as string;

  let valuePercent: number | null = null;
  let valueCents: number | null = null;

  if (type === "percentage") {
    valuePercent = parseInt(formData.get("value_percent") as string, 10);
  } else {
    valueCents = Math.round(parseFloat(formData.get("value_cents") as string) * 100);
  }

  const maxUses = formData.get("max_uses")
    ? parseInt(formData.get("max_uses") as string, 10)
    : null;

  const minCents = formData.get("min_cents")
    ? Math.round(parseFloat(formData.get("min_cents") as string) * 100)
    : null;

  const maxDiscountCents = formData.get("max_discount_cents")
    ? Math.round(parseFloat(formData.get("max_discount_cents") as string) * 100)
    : null;

  const expiryStr = formData.get("expires_at") as string;
  const expiresAt = expiryStr ? new Date(expiryStr).toISOString() : null;

  const { error } = await supabase.from("discount_codes").insert({
    org_id: orgId,
    code,
    type,
    value_percent: valuePercent,
    value_cents: valueCents,
    max_uses: maxUses,
    min_cents: minCents,
    max_discount_cents: maxDiscountCents,
    expires_at: expiresAt,
    description: description || null,
  });

  if (error) {
    if (error.message?.includes("unique") || error.code === "23505") {
      return { error: "A code with this name already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/discounts");
  return { success: true };
}

/**
 * Toggles a discount code's active status.
 */
export async function toggleDiscountCode(id: string, isActive: boolean) {
  const supabase = createClient();

  const { error } = await supabase
    .from("discount_codes")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/discounts");
  return { success: true };
}

/**
 * Deletes a discount code.
 */
export async function deleteDiscountCode(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/discounts");
  return { success: true };
}

export type DiscountResult =
  | { valid: true; discount_cents: number; final_cents: number; discount_id: string; message: string }
  | { valid: false; message: string };

/**
 * Validates and applies a discount code via the database RPC.
 */
export async function applyDiscountCode(
  orgId: string,
  code: string,
  amountCents: number,
): Promise<DiscountResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("apply_discount_code", {
    p_org_id: orgId,
    p_code: code,
    p_amount_cents: amountCents,
  });

  if (error) {
    return { valid: false, message: error.message };
  }

  const row = data?.[0];
  if (!row) {
    return { valid: false, message: "Could not validate code." };
  }

  if (!row.valid) {
    return { valid: false, message: row.message };
  }

  return {
    valid: true,
    discount_cents: row.discount_cents,
    final_cents: row.final_cents,
    discount_id: row.discount_id,
    message: row.message,
  };
}
