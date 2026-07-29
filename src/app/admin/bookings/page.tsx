import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminBookingList,
  type AdminBookingListData,
  type AdminBookingRow,
  type AdminBookingStatus,
  type BookingPaymentStatus,
} from "./admin-booking-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
};

type ResourceRow = {
  id: string;
  name: string;
};

type PaymentRow = {
  booking_id: string | null;
  status: string;
  amount_cents: number;
  created_at: string;
};

type LocationRow = {
  org_id: string;
  name: string;
  address: string | null;
};

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = Array.isArray(value) ? value[0] : value;
  const date = raw ? new Date(`${raw}T00:00:00`) : fallback;
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

function parseTimeRange(range: string | null | undefined) {
  if (!range) return null;
  const match = range.match(/\[([^,]+),([^)\]]+)/);
  if (!match) return null;
  const start = new Date(match[1]!);
  const end = new Date(match[2]!);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function normalizeStatus(status: string): AdminBookingStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "no_show") return "no_show";
  return "upcoming";
}

function paymentStatus(payments: PaymentRow[], priceCents: number): BookingPaymentStatus {
  if (payments.some((payment) => payment.status === "refunded")) return "refunded";
  if (payments.some((payment) => payment.status === "succeeded" || payment.status === "paid")) return "paid";
  if (priceCents <= 0) return "free";
  return "unpaid";
}

function bookingId(value: string, date: Date, index: number) {
  return `BK-${dateKey(date).replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`;
}

export default async function AdminBookings({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, monthAgo));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const [bookingResult, orgResult, customerResult, resourceResult, paymentResult, locationResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, org_id, resource_id, customer_id, status, price_cents, time_range, source, created_at, updated_at")
        .filter("time_range", "ov", `[${from.toISOString()},${to.toISOString()})`)
        .order("time_range", { ascending: false })
        .limit(5000),
      supabase.from("organizations").select("id, name, slug, logo_url").limit(5000),
      supabase.from("customers").select("id, name, email").limit(10000),
      supabase.from("resources").select("id, name").limit(5000),
      supabase.from("payments").select("booking_id, status, amount_cents, created_at").limit(20000),
      supabase.from("locations").select("org_id, name, address").limit(5000),
    ]);

  const bookings = (bookingResult.data ?? []) as BookingRow[];

  const orgById = new Map(((orgResult.data ?? []) as OrganizationRow[]).map((org) => [org.id, org]));
  const customerById = new Map(((customerResult.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]));
  const resourceById = new Map(((resourceResult.data ?? []) as ResourceRow[]).map((resource) => [resource.id, resource]));
  const paymentsByBooking = new Map<string, PaymentRow[]>();
  ((paymentResult.data ?? []) as PaymentRow[]).forEach((payment) => {
    if (!payment.booking_id) return;
    paymentsByBooking.set(payment.booking_id, [...(paymentsByBooking.get(payment.booking_id) ?? []), payment]);
  });
  const locationByOrg = new Map<string, LocationRow>();
  ((locationResult.data ?? []) as LocationRow[]).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) locationByOrg.set(location.org_id, location);
  });

  const rows: AdminBookingRow[] = bookings.map((booking, index) => {
    const range = parseTimeRange(booking.time_range);
    const start = range?.start ?? new Date(booking.created_at);
    const end = range?.end ?? new Date(start.getTime() + 60 * 60 * 1000);
    const organization = orgById.get(booking.org_id);
    const customer = customerById.get(booking.customer_id);
    const resource = resourceById.get(booking.resource_id);
    const location = locationByOrg.get(booking.org_id);
    return {
      id: booking.id,
      bookingCode: bookingId(booking.id, start, index),
      orgId: booking.org_id,
      orgSlug: organization?.slug || booking.org_id,
      orgName: organization?.name || "Unknown organization",
      orgLocation: location?.address || location?.name || "Location not set",
      orgLogoUrl: organization?.logo_url || null,
      customerName: customer?.name || "Unknown customer",
      customerEmail: customer?.email || "email not set",
      customerAvatarUrl: null,
      courtName: resource?.name || "Court not set",
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      durationMinutes: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000)),
      amountCents: Number(booking.price_cents),
      status: normalizeStatus(booking.status),
      paymentStatus: paymentStatus(paymentsByBooking.get(booking.id) ?? [], Number(booking.price_cents)),
      source: booking.source || "public",
      createdAt: booking.created_at,
    };
  });

  const total = rows.length || 1;
  const completed = rows.filter((row) => row.status === "completed").length;
  const upcoming = rows.filter((row) => row.status === "upcoming" && new Date(row.startsAt) >= new Date()).length;
  const cancelled = rows.filter((row) => row.status === "cancelled").length;
  const noShow = rows.filter((row) => row.status === "no_show").length;

  const notifications = [
    ...rows
      .filter((row) => row.status === "upcoming")
      .slice(0, 3)
      .map((row) => ({ id: `upcoming-${row.id}`, title: "Upcoming booking", detail: `${row.orgName} - ${row.courtName}`, at: row.startsAt })),
    ...rows
      .filter((row) => row.paymentStatus === "unpaid")
      .slice(0, 3)
      .map((row) => ({ id: `unpaid-${row.id}`, title: "Unpaid booking", detail: `${row.customerName} at ${row.orgName}`, at: row.startsAt })),
    ...rows
      .filter((row) => row.status === "cancelled" || row.status === "no_show")
      .slice(0, 3)
      .map((row) => ({ id: `attention-${row.id}`, title: row.status === "no_show" ? "No-show recorded" : "Booking cancelled", detail: `${row.customerName} - ${row.orgName}`, at: row.startsAt })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 6);

  const data: AdminBookingListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    metrics: [
      { key: "total", label: "Total Bookings", value: rows.length, change: 0, tone: "cyan" },
      { key: "completed", label: "Completed Bookings", value: completed, change: 0, detail: `${((completed / total) * 100).toFixed(1)}% of total`, tone: "green" },
      { key: "upcoming", label: "Upcoming Bookings", value: upcoming, change: 0, detail: "Next 7 days", tone: "orange" },
      { key: "cancelled", label: "Cancelled Bookings", value: cancelled, change: 0, detail: `${((cancelled / total) * 100).toFixed(1)}% of total`, tone: "purple" },
      { key: "no_show", label: "No-Show Bookings", value: noShow, change: 0, detail: `${((noShow / total) * 100).toFixed(1)}% of total`, tone: "red" },
    ],
    bookings: rows,
    organizations: Array.from(new Map(rows.map((row) => [row.orgId, { id: row.orgId, name: row.orgName }])).values()),
    notifications,
    demo: false,
  };

  return <AdminBookingList data={data} />;
}
