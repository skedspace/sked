import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function key(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function date(value: string | null, fallback: Date, end = false) {
  const parsed = value ? new Date(`${value}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

export async function GET(request: NextRequest) {
  const denied = await superAdminRouteGuard();
  if (denied) return denied;

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const from = date(request.nextUrl.searchParams.get("from"), monthAgo);
  const to = date(request.nextUrl.searchParams.get("to"), today, true);
  const supabase = createAdminClient();
  const { data } = await supabase.from("app_config").select("key, value, description, updated_at").order("key");
  const rows = [
    ["key", "value", "description", "updated_at"],
    ...((data?.length ? data : [{ key: "monthly_price_cents", value: DEFAULT_MONTHLY_PRICE_CENTS, description: "Default monthly subscription price", updated_at: new Date().toISOString() }]) ?? []),
  ];
  const csv = `\uFEFF${rows.map((row) => Array.isArray(row) ? row.map(cell).join(",") : [row.key, row.value, row.description, row.updated_at].map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-pricing-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
