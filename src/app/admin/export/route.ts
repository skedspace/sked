import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function validDate(value: string | null, fallback: Date) {
  const date = value ? new Date(`${value}T00:00:00`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const denied = await superAdminRouteGuard();
  if (denied) return denied;

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const from = validDate(request.nextUrl.searchParams.get("from"), defaultStart);
  const to = validDate(request.nextUrl.searchParams.get("to"), today);
  to.setHours(23, 59, 59, 999);

  const supabase = createAdminClient();
  const [organizations, bookings, payments, subscriptions] = await Promise.all([
    supabase.from("organizations").select("id, name, slug, plan, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at"),
    supabase.from("bookings").select("id, org_id, status, price_cents, source, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at"),
    supabase.from("payments").select("id, booking_id, status, amount_cents, provider, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at"),
    supabase.from("subscriptions").select("id, org_id, plan, status, current_period_start, current_period_end, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at"),
  ]);

  const orgById = new Map((organizations.data ?? []).map((org) => [org.id, org.name]));
  const bookingById = new Map((bookings.data ?? []).map((booking) => [booking.id, booking]));
  const rows: unknown[][] = [
    ["record_type", "id", "organization", "status_or_plan", "amount_php", "reference", "created_at"],
    ...(organizations.data ?? []).map((org) => [
      "organization",
      org.id,
      org.name,
      org.plan,
      "",
      org.slug,
      org.created_at,
    ]),
    ...(bookings.data ?? []).map((booking) => [
      "booking",
      booking.id,
      orgById.get(booking.org_id) ?? booking.org_id,
      booking.status,
      Number(booking.price_cents ?? 0) / 100,
      booking.source,
      booking.created_at,
    ]),
    ...(payments.data ?? []).map((payment) => {
      const booking = bookingById.get(payment.booking_id);
      return [
        "payment",
        payment.id,
        booking ? orgById.get(booking.org_id) ?? booking.org_id : "",
        payment.status,
        Number(payment.amount_cents ?? 0) / 100,
        payment.provider,
        payment.created_at,
      ];
    }),
    ...(subscriptions.data ?? []).map((subscription) => [
      "subscription",
      subscription.id,
      orgById.get(subscription.org_id) ?? subscription.org_id,
      `${subscription.plan}:${subscription.status}`,
      "",
      `${subscription.current_period_start} to ${subscription.current_period_end}`,
      subscription.created_at,
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const filename = `sked-admin-report-${localDateKey(from)}-${localDateKey(to)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
