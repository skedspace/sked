import { NextResponse } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AuditDbRow = {
  id: number;
  org_id: string;
  actor_id: string;
  action: string;
  target: string | null;
  payload: unknown;
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
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function orgName(row: AuditDbRow) {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  return org?.name ?? "";
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
  const result = await withTimeout<SupabaseResult<AuditDbRow>>(
    supabase
      .from("audit_log")
      .select("id, org_id, actor_id, action, target, payload, created_at, organizations(name)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000),
    { data: [], error: null },
  );

  const rows = (result.data ?? []) as AuditDbRow[];
  const csv = [
    ["date_time", "actor_id", "action", "resource", "resource_id", "organization", "payload"].join(","),
    ...rows.map((row) =>
      [
        row.created_at,
        row.actor_id,
        row.action,
        row.target ?? "",
        row.id,
        orgName(row),
        JSON.stringify(row.payload ?? {}),
      ].map(csvCell).join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-audit-logs-${dateKey(from)}-${dateKey(to)}.csv"`,
    },
  });
}
