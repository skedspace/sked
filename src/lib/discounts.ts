export type DiscountType = "percentage" | "fixed";

export type DiscountCode = {
  id: string;
  org_id: string;
  code: string;
  type: DiscountType;
  value_percent: number | null;
  value_cents: number | null;
  max_uses: number | null;
  current_uses: number;
  min_cents: number | null;
  max_discount_cents: number | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

/**
 * Formats a discount code value for display.
 */
export function formatDiscountValue(
  type: DiscountType,
  valuePercent: number | null,
  valueCents: number | null,
): string {
  if (type === "percentage") {
    return `${valuePercent}% off`;
  }
  if (valueCents != null) {
    return `₱${(valueCents / 100).toLocaleString("en-PH")} off`;
  }
  return "";
}

/**
 * Generates a random alphanumeric discount code.
 */
export function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
