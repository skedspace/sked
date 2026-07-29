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

function mockData(from: Date, to: Date): AdminBookingListData {
  const baseline = new Date(Math.min(Date.now(), to.getTime()));
  const at = (days: number, hour: number, durationMinutes: number) => {
    const start = new Date(baseline);
    start.setDate(start.getDate() - days);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);
    return { start: start.toISOString(), end: end.toISOString(), minutes: durationMinutes };
  };
  const rows: AdminBookingRow[] = [
    ["001", "Ace Pickleball Club", "Makati City, PH", "Juan Dela Cruz", "juan.delacruz@email.com", "Court 2", 90000, "completed", "paid", at(0, 18, 90)],
    ["002", "The Pickle Yard", "Cebu City, PH", "Maria Santos", "maria.santos@email.com", "Court 1", 60000, "upcoming", "paid", at(0, 19, 60)],
    ["003", "Rally Point Pickleball", "Davao City, PH", "Kevin Reyes", "kevin.reyes@email.com", "Court 3", 100000, "upcoming", "paid", at(0, 20, 90)],
    ["014", "Pickle Hub", "Quezon City, PH", "Angela Lopez", "angela.lopez@email.com", "Court 4", 85000, "completed", "paid", at(1, 18, 90)],
    ["013", "Smash Pickleball Center", "Taguig City, PH", "David Tan", "david.tan@email.com", "Court 1", 60000, "cancelled", "refunded", at(1, 17, 60)],
    ["012", "Bay Pickleball Club", "Iloilo City, PH", "Nicole Garcia", "nicole.garcia@email.com", "Court 2", 90000, "no_show", "paid", at(1, 19, 90)],
    ["011", "CourtSide PH", "Bacolod City, PH", "Joshua Lim", "joshua.lim@email.com", "Court 3", 60000, "completed", "paid", at(2, 20, 60)],
    ["010", "Ace Pickleball Club", "Makati City, PH", "Miguel Santos", "miguel.santos@email.com", "Court 1", 90000, "upcoming", "unpaid", at(2, 18, 90)],
  ].map((item, index) => {
    const time = item[9] as ReturnType<typeof at>;
    const start = new Date(time.start);
    return {
      id: `mock-booking-${item[0]}`,
      bookingCode: `BK-${dateKey(start).replaceAll("-", "")}-${item[0]}`,
      orgId: `mock-org-${index}`,
      orgSlug: String(item[1]).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      orgName: String(item[1]),
      orgLocation: String(item[2]),
      orgLogoUrl: null,
      customerName: String(item[3]),
      customerEmail: String(item[4]),
      customerAvatarUrl: null,
      courtName: String(item[5]),
      startsAt: time.start,
      endsAt: time.end,
      durationMinutes: time.minutes,
      amountCents: Number(item[6]),
      status: item[7] as AdminBookingStatus,
      paymentStatus: item[8] as BookingPaymentStatus,
      source: "public",
      createdAt: time.start,
    };
  });

  return {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: 1248,
    metrics: [
      { key: "total", label: "Total Bookings", value: 1248, change: 0, tone: "cyan" },
      { key: "completed", label: "Completed Bookings", value: 1038, change: 0, detail: "83.2% of total", tone: "green" },
      { key: "upcoming", label: "Upcoming Bookings", value: 156, change: 0, detail: "Next 7 days", tone: "orange" },
      { key: "cancelled", label: "Cancelled Bookings", value: 54, change: 0, detail: "4.3% of total", tone: "purple" },
      { key: "no_show", label: "No-Show Bookings", value: 12, change: 0, detail: "1.0% of total", tone: "red" },
    ],
    bookings: rows,
    organizations: Array.from(new Map(rows.map((row) => [row.orgId, { id: row.orgId, name: row.orgName }])).values()),
    notifications: [
      { id: "n1", title: "Upcoming booking", detail: "The Pickle Yard - Court 1", at: rows[1]!.startsAt },
      { id: "n2", title: "Booking completed", detail: "Ace Pickleball Club - Court 2", at: rows[0]!.startsAt },
      { id: "n3", title: "No-show recorded", detail: "Bay Pickleball Club - Nicole Garcia", at: rows[5]!.startsAt },
      { id: "n4", title: "Booking cancelled", detail: "Smash Pickleball Center refunded", at: rows[4]!.startsAt },
      { id: "n5", title: "Unpaid booking", detail: "Miguel Santos has an unpaid booking", at: rows[7]!.startsAt },
      { id: "n6", title: "Court assigned", detail: "Rally Point Pickleball - Court 3", at: rows[2]!.startsAt },
    ],
    demo: true,
  };
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
  if (bookings.length === 0) return <AdminBookingList data={mockData(from, to)} />;

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
