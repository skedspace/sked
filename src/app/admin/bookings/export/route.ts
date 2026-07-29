import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  org_id: string;
  resource_id: string;
  customer_id: string;
  status: string;
  price_cents: number;
  time_range: string;
  source: string | null;
  created_at: string;
};

function date(value: string | null, fallback: Date, end = false) {
  const parsed = value ? new Date(`${value}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

function key(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function parseTimeRange(range: string | null | undefined) {
  if (!range) return null;
  const match = range.match(/\[([^,]+),([^)\]]+)/);
  if (!match) return null;
  const start = new Date(match[1]!);
  const end = new Date(match[2]!);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

  const [bookingResult, orgResult, customerResult, resourceResult, paymentResult, locationResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, org_id, resource_id, customer_id, status, price_cents, time_range, source, created_at")
        .filter("time_range", "ov", `[${from.toISOString()},${to.toISOString()})`)
        .order("time_range", { ascending: false })
        .limit(50000),
      supabase.from("organizations").select("id, name, slug").limit(5000),
      supabase.from("customers").select("id, name, email").limit(10000),
      supabase.from("resources").select("id, name").limit(5000),
      supabase.from("payments").select("booking_id, status").limit(50000),
      supabase.from("locations").select("org_id, name, address").limit(5000),
    ]);

  const orgById = new Map((orgResult.data ?? []).map((org) => [org.id, org]));
  const customerById = new Map((customerResult.data ?? []).map((customer) => [customer.id, customer]));
  const resourceById = new Map((resourceResult.data ?? []).map((resource) => [resource.id, resource]));
  const locationByOrg = new Map<string, string>();
  (locationResult.data ?? []).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) {
      locationByOrg.set(location.org_id, location.address || location.name || "");
    }
  });
  const paymentsByBooking = new Map<string, string[]>();
  (paymentResult.data ?? []).forEach((payment) => {
    if (!payment.booking_id) return;
    paymentsByBooking.set(payment.booking_id, [...(paymentsByBooking.get(payment.booking_id) ?? []), payment.status]);
  });

  const rows = [
    ["booking_id", "booking_code", "organization", "organization_slug", "location", "customer", "customer_email", "court", "starts_at", "ends_at", "duration_minutes", "amount_cents", "status", "payment", "source"],
    ...((bookingResult.data ?? []) as BookingRow[]).map((booking, index) => {
      const range = parseTimeRange(booking.time_range);
      const start = range?.start ?? new Date(booking.created_at);
      const end = range?.end ?? new Date(start.getTime() + 60 * 60 * 1000);
      const org = orgById.get(booking.org_id);
      const customer = customerById.get(booking.customer_id);
      const resource = resourceById.get(booking.resource_id);
      const paymentStatuses = paymentsByBooking.get(booking.id) ?? [];
      const payment = paymentStatuses.includes("refunded")
        ? "refunded"
        : paymentStatuses.some((status) => status === "succeeded" || status === "paid")
          ? "paid"
          : booking.price_cents <= 0
            ? "free"
            : "unpaid";
      return [
        booking.id,
        `BK-${key(start).replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`,
        org?.name || "",
        org?.slug || "",
        locationByOrg.get(booking.org_id) || "",
        customer?.name || "",
        customer?.email || "",
        resource?.name || "",
        start.toISOString(),
        end.toISOString(),
        Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000)),
        booking.price_cents,
        booking.status,
        payment,
        booking.source || "",
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-bookings-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
