import { NextResponse } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DiscountRow = {
  code: string;
  type: string;
  value_percent: number | null;
  value_cents: number | null;
  max_uses: number | null;
  current_uses: number | null;
  min_cents: number | null;
  max_discount_cents: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  description: string | null;
  created_at: string;
  organizations?: { name: string } | { name: string }[] | null;
};

type SupabaseResult<T> = { data: T[] | null; error: unknown };

function asDate(value: string | null, fallback: Date) {
  const date = value ? new Date(`${value}T00:00:00`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function status(row: DiscountRow, now = new Date()) {
  if (!row.is_active) return "draft";
  const starts = row.starts_at ? new Date(row.starts_at) : null;
  const expires = row.expires_at ? new Date(row.expires_at) : null;
  if (starts && starts > now) return "scheduled";
  if (expires && expires < now) return "expired";
  if (row.max_uses && Number(row.current_uses ?? 0) >= row.max_uses) return "expired";
  return "active";
}

function orgName(row: DiscountRow) {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  return org?.name ?? "";
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function withTimeout<T>(promise: PromiseLike<unknown>, fallback: T, ms = 1600): Promise<T> {
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

export async function GET(request: Request) {
  const denied = await superAdminRouteGuard();
  if (denied) return denied;

  const url = new URL(request.url);
  const today = endOfDay(new Date());
  const fallbackFrom = new Date(today);
  fallbackFrom.setDate(fallbackFrom.getDate() - 30);
  const rawFrom = startOfDay(asDate(url.searchParams.get("from"), fallbackFrom));
  const rawTo = endOfDay(asDate(url.searchParams.get("to"), today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const { data } = await withTimeout<SupabaseResult<DiscountRow>>(
    supabase
      .from("discount_codes")
      .select("code, type, value_percent, value_cents, max_uses, current_uses, min_cents, max_discount_cents, starts_at, expires_at, is_active, description, created_at, organizations(name)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000),
    { data: [], error: null },
  );

  const rows = (data ?? []) as DiscountRow[];
  const csv = [
    ["promotion", "organization", "code", "type", "status", "current_uses", "max_uses", "value_percent", "value_php", "min_purchase_php", "max_discount_php", "starts_at", "expires_at", "created_at"].join(","),
    ...rows.map((row) =>
      [
        row.description,
        orgName(row),
        row.code,
        row.type,
        status(row),
        row.current_uses ?? 0,
        row.max_uses ?? "",
        row.value_percent ?? "",
        row.value_cents ? (row.value_cents / 100).toFixed(2) : "",
        row.min_cents ? (row.min_cents / 100).toFixed(2) : "",
        row.max_discount_cents ? (row.max_discount_cents / 100).toFixed(2) : "",
        row.starts_at ?? "",
        row.expires_at ?? "",
        row.created_at,
      ].map(csvCell).join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-promotions-${dateKey(from)}-${dateKey(to)}.csv"`,
    },
  });
}
