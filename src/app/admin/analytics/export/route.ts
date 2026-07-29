import { NextResponse } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BookingRow = { id: string; status: string; created_at: string; time_range: string | null };
type PaymentRow = { id: string; amount_cents: number | null; status: string; created_at: string };
type InvoiceRow = { id: string; amount_cents: number | null; status: string; paid_at: string | null; created_at: string };
type OrgRow = { id: string; created_at: string; deleted_at?: string | null };
type MemberRow = { user_id: string; created_at: string };

const DAY = 86_400_000;

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

function parseTimeRangeStart(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\[([^,]+),/);
  if (!match) return null;
  const date = new Date(match[1]!);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowsForRange(from: Date, to: Date) {
  const rows: Array<{ date: string; revenueCents: number; bookings: number; users: number; organizations: number }> = [];
  for (let cursor = startOfDay(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY)) {
    rows.push({ date: dateKey(cursor), revenueCents: 0, bookings: 0, users: 0, organizations: 0 });
  }
  return rows;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
  const [bookingResult, paymentResult, invoiceResult, orgResult, memberResult] = await Promise.all([
    supabase.from("bookings").select("id, status, created_at, time_range").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000),
    supabase.from("payments").select("id, amount_cents, status, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000),
    supabase.from("subscription_invoices").select("id, amount_cents, status, paid_at, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000),
    supabase.from("organizations").select("id, created_at, deleted_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000),
    supabase.from("org_members").select("user_id, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000),
  ]);

  const rows = rowsForRange(from, to);
  const byDate = new Map(rows.map((row) => [row.date, row]));

  ((paymentResult.data ?? []) as PaymentRow[])
    .filter((payment) => payment.status === "succeeded" || payment.status === "paid")
    .forEach((payment) => {
      const row = byDate.get(dateKey(new Date(payment.created_at)));
      if (row) row.revenueCents += Number(payment.amount_cents ?? 0);
    });
  ((invoiceResult.data ?? []) as InvoiceRow[])
    .filter((invoice) => invoice.status === "paid")
    .forEach((invoice) => {
      const row = byDate.get(dateKey(new Date(invoice.paid_at || invoice.created_at)));
      if (row) row.revenueCents += Number(invoice.amount_cents ?? 0);
    });
  ((bookingResult.data ?? []) as BookingRow[]).forEach((booking) => {
    const row = byDate.get(dateKey(parseTimeRangeStart(booking.time_range) ?? new Date(booking.created_at)));
    if (row) row.bookings += 1;
  });
  ((orgResult.data ?? []) as OrgRow[])
    .filter((org) => !org.deleted_at)
    .forEach((org) => {
      const row = byDate.get(dateKey(new Date(org.created_at)));
      if (row) row.organizations += 1;
    });
  ((memberResult.data ?? []) as MemberRow[]).forEach((member) => {
    const row = byDate.get(dateKey(new Date(member.created_at)));
    if (row) row.users += 1;
  });

  const csv = [
    ["date", "revenue_php", "bookings", "new_users", "new_organizations"].join(","),
    ...rows.map((row) => [row.date, (row.revenueCents / 100).toFixed(2), row.bookings, row.users, row.organizations].map(csvCell).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-analytics-${dateKey(from)}-${dateKey(to)}.csv"`,
    },
  });
}
