import { createAdminClient } from "@/lib/supabase/admin";
import { readPlatformPricingConfig } from "@/lib/pricing-config";
import { AdminAnalytics, type AdminAnalyticsData } from "./admin-analytics";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type OrgRow = { id: string; name: string; plan: string | null; created_at: string; deleted_at?: string | null };
type MemberRow = { user_id: string; org_id: string; role: string; created_at: string };
type BookingRow = { id: string; org_id: string; resource_id: string | null; status: string; price_cents: number | null; time_range: string | null; created_at: string };
type PaymentRow = { id: string; booking_id: string | null; org_id: string | null; amount_cents: number | null; status: string; created_at: string };
type SubscriptionRow = { id: string; org_id: string; plan: string; status: string; current_period_end: string | null; created_at: string; updated_at: string | null };
type InvoiceRow = { id: string; subscription_id: string; amount_cents: number | null; status: string; paid_at: string | null; created_at: string };
type ResourceRow = { id: string; org_id: string };

type SupabaseResult<T> = { data: T[] | null; error: unknown; count?: number | null };

const DAY = 86_400_000;

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

function parseTimeRangeStart(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\[([^,]+),/);
  if (!match) return null;
  const date = new Date(match[1]!);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeRangeMinutes(value: string | null | undefined) {
  if (!value) return 0;
  const match = value.match(/\[([^,]+),([^)\]]+)/);
  if (!match) return 0;
  const start = new Date(match[1]!);
  const end = new Date(match[2]!);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function inRange(value: string | Date | null | undefined, from: Date, to: Date) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date >= from && date <= to;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
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

function emptyResult<T>(): SupabaseResult<T> {
  return { data: [], error: null, count: 0 };
}

function daysBetween(from: Date, to: Date) {
  const days: Date[] = [];
  for (let cursor = startOfDay(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY)) {
    days.push(cursor);
  }
  return days;
}

function makeDailySeries(from: Date, to: Date) {
  return daysBetween(from, to).map((date) => ({
    date: dateKey(date),
    revenueCents: 0,
    previousRevenueCents: 0,
    bookings: 0,
    users: 0,
    organizations: 0,
  }));
}

function seededMockData(from: Date, to: Date, monthlyPriceCents: number): AdminAnalyticsData {
  const now = new Date();
  const days = makeDailySeries(from, to);
  const series = days.map((point, index) => {
    const wave = Math.sin(index * 0.85) * 1800;
    const lift = index * 420;
    const revenueCents = Math.round(690_000 + wave + lift + (index % 7 === 2 ? 480_000 : 0));
    return {
      ...point,
      revenueCents,
      previousRevenueCents: Math.max(120_000, Math.round(revenueCents * 0.78 - 95_000)),
      bookings: 36 + ((index * 7) % 58) + (index % 8 === 4 ? 35 : 0),
      users: 7 + index * 5 + (index % 5 === 0 ? 18 : 0),
      organizations: index % 4 === 0 ? 2 : index % 7 === 0 ? 1 : 0,
    };
  });
  const totalRevenue = series.reduce((sum, point) => sum + point.revenueCents, 0);
  const totalBookings = series.reduce((sum, point) => sum + point.bookings, 0);
  const newUsers = series.reduce((sum, point) => sum + point.users, 0);
  const newOrganizations = series.reduce((sum, point) => sum + point.organizations, 0);
  const previousRevenue = series.reduce((sum, point) => sum + point.previousRevenueCents, 0);
  const mrc = monthlyPriceCents * 198;
  return {
    range: { from: dateKey(from), to: dateKey(to) },
    metrics: [
      { key: "revenue", label: "Total Revenue", value: totalRevenue, previousValue: previousRevenue, kind: "money", tone: "cyan" },
      { key: "organizations", label: "New Organizations", value: newOrganizations || 28, previousValue: 24, kind: "number", tone: "green" },
      { key: "users", label: "New Users", value: newUsers, previousValue: Math.round(newUsers * 0.84), kind: "number", tone: "purple" },
      { key: "bookings", label: "Total Bookings", value: totalBookings, previousValue: Math.round(totalBookings * 0.81), kind: "number", tone: "orange" },
      { key: "utilization", label: "Court Utilization", value: 68.4, previousValue: 63.5, kind: "percent", tone: "cyan" },
    ],
    revenueSeries: series,
    bookingsSeries: series.map(({ date, bookings }) => ({ date, value: bookings })),
    userGrowthSeries: series.map(({ date }, index) => ({
      date,
      value: series.slice(0, index + 1).reduce((sum, item) => sum + item.users, 0),
    })),
    mrc: {
      totalCents: mrc,
      previousCents: Math.round(mrc * 0.83),
      rows: [
        { label: "Premium Monthly", valueCents: Math.round(mrc * 0.795), percent: 79.5, color: "#11dce4" },
        { label: "Free Trial (Converted)", valueCents: Math.round(mrc * 0.143), percent: 14.3, color: "#65b82e" },
        { label: "Annual Plans", valueCents: Math.round(mrc * 0.052), percent: 5.2, color: "#8d55d8" },
        { label: "Other", valueCents: Math.round(mrc * 0.01), percent: 1.0, color: "#ff9517" },
      ],
    },
    revenueByPlan: [
      { label: "Premium Monthly", valueCents: Math.round(totalRevenue * 0.598), percent: 59.8, color: "#11dce4" },
      { label: "Free Trial (Converted)", valueCents: Math.round(totalRevenue * 0.264), percent: 26.4, color: "#65b82e" },
      { label: "Annual Plans", valueCents: Math.round(totalRevenue * 0.104), percent: 10.4, color: "#8d55d8" },
      { label: "Other", valueCents: Math.round(totalRevenue * 0.034), percent: 3.4, color: "#ff9517" },
    ],
    insights: buildInsights(series, totalRevenue, previousRevenue, totalBookings, newOrganizations || 28, 68.4),
    notifications: [
      { id: "mock-revenue", title: "Revenue is trending up", detail: "Current period is outperforming the previous period.", at: to.toISOString(), tone: "success" },
      { id: "mock-bookings", title: "Peak booking volume", detail: "Evening court demand is strongest this period.", at: new Date(to.getTime() - DAY).toISOString(), tone: "info" },
      { id: "mock-plan", title: "Annual plan opportunity", detail: "Show annual savings to premium prospects.", at: new Date(to.getTime() - 2 * DAY).toISOString(), tone: "warning" },
      { id: "mock-users", title: "User growth active", detail: `${newUsers.toLocaleString()} new users in the selected range.`, at: new Date(to.getTime() - 3 * DAY).toISOString(), tone: "info" },
      { id: "mock-utilization", title: "Utilization target", detail: "Court utilization is nearing the 70% goal.", at: new Date(to.getTime() - 4 * DAY).toISOString(), tone: "success" },
      { id: "mock-report", title: "Report ready", detail: "Analytics export is available for this period.", at: new Date(to.getTime() - 5 * DAY).toISOString(), tone: "info" },
    ].map((notification) => ({
      ...notification,
      relativeLabel: relativeLabel(notification.at, now),
    })) as AdminAnalyticsData["notifications"],
    demo: true,
  };
}

function buildInsights(
  series: AdminAnalyticsData["revenueSeries"],
  currentRevenue: number,
  previousRevenue: number,
  totalBookings: number,
  newOrganizations: number,
  utilization: number,
): AdminAnalyticsData["insights"] {
  const revenueChange = percentChange(currentRevenue, previousRevenue);
  const peak = [...series].sort((a, b) => b.bookings - a.bookings)[0] ?? series[0];
  const activeHour = "6:00 PM - 10:00 PM";
  return [
    {
      key: "revenue",
      title: `Revenue is ${revenueChange >= 0 ? "up" : "down"} ${Math.abs(revenueChange).toFixed(1)}%`,
      detail: `You earned ${money(currentRevenue)} this period vs ${money(previousRevenue)} previously.`,
      tone: revenueChange >= 0 ? "cyan" : "red",
    },
    {
      key: "peak",
      title: "Peak booking day",
      detail: peak ? `${formatLongDate(peak.date)} with ${peak.bookings.toLocaleString()} of ${totalBookings.toLocaleString()} bookings.` : "No bookings in this period yet.",
      tone: "purple",
    },
    {
      key: "orgs",
      title: `${newOrganizations.toLocaleString()} new organizations`,
      detail: newOrganizations > 0 ? "New venues joined SKED during the selected range." : "No new organizations registered in this range.",
      tone: "green",
    },
    {
      key: "time",
      title: "Most active time",
      detail: `${activeHour} generates the most bookings.`,
      tone: "orange",
    },
    {
      key: "utilization",
      title: "Court utilization",
      detail: `${utilization.toFixed(1)}% this period. Aim for 70%+.`,
      tone: "cyan",
    },
  ];
}

function money(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatLongDate(key: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(`${key}T00:00:00`));
}

function relativeLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffSeconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds || 1} seconds ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function planBucket(subscription: SubscriptionRow | undefined) {
  if (!subscription) return "Other";
  if (subscription.plan === "trial") return "Free Trial (Converted)";
  if (subscription.plan.includes("annual") || subscription.plan.includes("year")) return "Annual Plans";
  return "Premium Monthly";
}

function colorForPlan(label: string) {
  if (label === "Premium Monthly") return "#11dce4";
  if (label === "Free Trial (Converted)") return "#65b82e";
  if (label === "Annual Plans") return "#8d55d8";
  return "#ff9517";
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, defaultStart));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const periodMs = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs + 1);

  const supabase = createAdminClient();
  const pricing = await readPlatformPricingConfig();
  const [orgResult, memberResult, bookingResult, previousBookingResult, paymentResult, previousPaymentResult, invoiceResult, previousInvoiceResult, subscriptionResult, resourceResult] =
    await Promise.all([
      withTimeout(supabase.from("organizations").select("id, name, plan, created_at, deleted_at").limit(5000), emptyResult<OrgRow>()),
      withTimeout(supabase.from("org_members").select("user_id, org_id, role, created_at").limit(10000), emptyResult<MemberRow>()),
      withTimeout(supabase.from("bookings").select("id, org_id, resource_id, status, price_cents, time_range, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000), emptyResult<BookingRow>()),
      withTimeout(supabase.from("bookings").select("id, org_id, resource_id, status, price_cents, time_range, created_at").gte("created_at", previousFrom.toISOString()).lte("created_at", previousTo.toISOString()).limit(50000), emptyResult<BookingRow>()),
      withTimeout(supabase.from("payments").select("id, booking_id, org_id, amount_cents, status, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000), emptyResult<PaymentRow>()),
      withTimeout(supabase.from("payments").select("id, booking_id, org_id, amount_cents, status, created_at").gte("created_at", previousFrom.toISOString()).lte("created_at", previousTo.toISOString()).limit(50000), emptyResult<PaymentRow>()),
      withTimeout(supabase.from("subscription_invoices").select("id, subscription_id, amount_cents, status, paid_at, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000), emptyResult<InvoiceRow>()),
      withTimeout(supabase.from("subscription_invoices").select("id, subscription_id, amount_cents, status, paid_at, created_at").gte("created_at", previousFrom.toISOString()).lte("created_at", previousTo.toISOString()).limit(50000), emptyResult<InvoiceRow>()),
      withTimeout(supabase.from("subscriptions").select("id, org_id, plan, status, current_period_end, created_at, updated_at").limit(10000), emptyResult<SubscriptionRow>()),
      withTimeout(supabase.from("resources").select("id, org_id").limit(10000), emptyResult<ResourceRow>()),
    ]);

  const organizations = ((orgResult.data ?? []) as OrgRow[]).filter((row) => !row.deleted_at);
  const members = (memberResult.data ?? []) as MemberRow[];
  const bookings = (bookingResult.data ?? []) as BookingRow[];
  const previousBookings = (previousBookingResult.data ?? []) as BookingRow[];
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  const previousPayments = (previousPaymentResult.data ?? []) as PaymentRow[];
  const invoices = (invoiceResult.data ?? []) as InvoiceRow[];
  const previousInvoices = (previousInvoiceResult.data ?? []) as InvoiceRow[];
  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];
  const resources = (resourceResult.data ?? []) as ResourceRow[];

  const hasLiveData = organizations.length + members.length + bookings.length + payments.length + invoices.length + subscriptions.length + resources.length > 0;
  if (!hasLiveData) return <AdminAnalytics data={seededMockData(from, to, pricing.monthlyPriceCents)} />;

  const subscriptionById = new Map(subscriptions.map((row) => [row.id, row]));
  const subscriptionByOrg = new Map<string, SubscriptionRow>();
  subscriptions.forEach((row) => {
    if (!subscriptionByOrg.has(row.org_id)) subscriptionByOrg.set(row.org_id, row);
  });
  const bookingById = new Map(bookings.map((row) => [row.id, row]));

  const series = makeDailySeries(from, to);
  const previousSeries = makeDailySeries(previousFrom, previousTo);
  const pointByDate = new Map(series.map((point) => [point.date, point]));
  const previousPointByOffset = new Map(previousSeries.map((point, index) => [index, point]));
  const currentRevenueEvents = [
    ...payments.filter((row) => row.status === "succeeded" || row.status === "paid").map((row) => ({ date: row.created_at, cents: Number(row.amount_cents ?? 0), orgId: row.org_id || bookingById.get(row.booking_id || "")?.org_id || null, subscriptionId: null as string | null })),
    ...invoices.filter((row) => row.status === "paid").map((row) => ({ date: row.paid_at || row.created_at, cents: Number(row.amount_cents ?? 0), orgId: subscriptionById.get(row.subscription_id)?.org_id || null, subscriptionId: row.subscription_id })),
  ];
  const previousRevenueEvents = [
    ...previousPayments.filter((row) => row.status === "succeeded" || row.status === "paid").map((row) => ({ date: row.created_at, cents: Number(row.amount_cents ?? 0) })),
    ...previousInvoices.filter((row) => row.status === "paid").map((row) => ({ date: row.paid_at || row.created_at, cents: Number(row.amount_cents ?? 0) })),
  ];

  currentRevenueEvents.forEach((event) => {
    const point = pointByDate.get(dateKey(new Date(event.date)));
    if (point) point.revenueCents += event.cents;
  });
  previousRevenueEvents.forEach((event) => {
    const index = Math.floor((startOfDay(new Date(event.date)).getTime() - startOfDay(previousFrom).getTime()) / DAY);
    const currentPoint = previousPointByOffset.has(index) ? series[index] : null;
    if (currentPoint) currentPoint.previousRevenueCents += event.cents;
  });
  bookings.forEach((booking) => {
    const start = parseTimeRangeStart(booking.time_range) ?? new Date(booking.created_at);
    const point = pointByDate.get(dateKey(start));
    if (point) point.bookings += 1;
  });
  members.forEach((member) => {
    if (!inRange(member.created_at, from, to)) return;
    const point = pointByDate.get(dateKey(new Date(member.created_at)));
    if (point) point.users += 1;
  });
  organizations.forEach((organization) => {
    if (!inRange(organization.created_at, from, to)) return;
    const point = pointByDate.get(dateKey(new Date(organization.created_at)));
    if (point) point.organizations += 1;
  });

  const totalRevenue = series.reduce((sum, point) => sum + point.revenueCents, 0);
  const previousRevenue = previousRevenueEvents.reduce((sum, event) => sum + event.cents, 0);
  const totalBookings = bookings.length;
  const previousBookingCount = previousBookings.length;
  const newUsers = members.filter((member) => inRange(member.created_at, from, to)).length;
  const previousUsers = members.filter((member) => inRange(member.created_at, previousFrom, previousTo)).length;
  const newOrganizations = organizations.filter((org) => inRange(org.created_at, from, to)).length;
  const previousOrganizations = organizations.filter((org) => inRange(org.created_at, previousFrom, previousTo)).length;
  const selectedDays = Math.max(1, series.length);
  const bookedMinutes = bookings.reduce((sum, booking) => {
    if (["cancelled", "canceled", "no_show"].includes(booking.status)) return sum;
    return sum + parseTimeRangeMinutes(booking.time_range);
  }, 0);
  const utilization = resources.length ? Math.min(100, (bookedMinutes / (resources.length * selectedDays * 12 * 60)) * 100) : 0;
  const previousBookedMinutes = previousBookings.reduce((sum, booking) => sum + parseTimeRangeMinutes(booking.time_range), 0);
  const previousUtilization = resources.length ? Math.min(100, (previousBookedMinutes / (resources.length * selectedDays * 12 * 60)) * 100) : 0;

  const activePremium = subscriptions.filter((row) => row.status === "active" && row.plan !== "trial");
  const mrcTotal = activePremium.length * pricing.monthlyPriceCents;
  const currentRevenueByPlan = new Map<string, number>();
  currentRevenueEvents.forEach((event) => {
    const subscription = event.subscriptionId ? subscriptionById.get(event.subscriptionId) : event.orgId ? subscriptionByOrg.get(event.orgId) : undefined;
    const label = planBucket(subscription);
    currentRevenueByPlan.set(label, (currentRevenueByPlan.get(label) ?? 0) + event.cents);
  });
  if (currentRevenueByPlan.size === 0 && mrcTotal > 0) currentRevenueByPlan.set("Premium Monthly", mrcTotal);
  const planTotal = [...currentRevenueByPlan.values()].reduce((sum, value) => sum + value, 0) || 1;
  const revenueByPlan = [...currentRevenueByPlan.entries()]
    .map(([label, valueCents]) => ({ label, valueCents, percent: (valueCents / planTotal) * 100, color: colorForPlan(label) }))
    .sort((a, b) => b.valueCents - a.valueCents);

  const convertedTrials = subscriptions.filter((row) => row.plan !== "trial" && inRange(row.created_at, from, to)).length;
  const mrcRows = [
    { label: "Premium Monthly", valueCents: mrcTotal, color: "#11dce4" },
    { label: "Free Trial (Converted)", valueCents: convertedTrials * pricing.monthlyPriceCents, color: "#65b82e" },
    { label: "Annual Plans", valueCents: revenueByPlan.find((row) => row.label === "Annual Plans")?.valueCents ?? 0, color: "#8d55d8" },
    { label: "Other", valueCents: revenueByPlan.find((row) => row.label === "Other")?.valueCents ?? 0, color: "#ff9517" },
  ];
  const mrcBase = Math.max(1, mrcRows.reduce((sum, row) => sum + row.valueCents, 0));
  const enrichedMrcRows = mrcRows.map((row) => ({ ...row, percent: (row.valueCents / mrcBase) * 100 }));

  const cumulativeUsers = series.reduce<Array<{ date: string; value: number }>>((acc, point) => {
    const prior = acc.at(-1)?.value ?? 0;
    acc.push({ date: point.date, value: prior + point.users });
    return acc;
  }, []);
  const notificationNow = new Date();
  const notificationWindowEnd = new Date(notificationNow.getTime() + 3 * DAY);
  const notifications = [
    ...payments
      .filter((payment) => payment.status === "failed" || payment.status === "pending")
      .slice(0, 3)
      .map((payment) => ({ id: `payment-${payment.id}`, title: payment.status === "failed" ? "Payment failed" : "Payment pending", detail: `${money(Number(payment.amount_cents ?? 0))} requires review`, at: payment.created_at, tone: payment.status === "failed" ? "danger" as const : "warning" as const })),
    ...subscriptions
      .filter((sub) => sub.status === "past_due" || (sub.plan === "trial" && sub.current_period_end && inRange(sub.current_period_end, notificationNow, notificationWindowEnd)))
      .slice(0, 3)
      .map((sub) => ({ id: `sub-${sub.id}`, title: sub.status === "past_due" ? "Subscription past due" : "Trial ending soon", detail: `Organization ${sub.org_id.slice(0, 8)} needs follow-up`, at: sub.updated_at || sub.created_at, tone: sub.status === "past_due" ? "danger" as const : "warning" as const })),
    ...organizations
      .filter((org) => inRange(org.created_at, from, to))
      .slice(0, 3)
      .map((org) => ({ id: `org-${org.id}`, title: "New organization", detail: org.name, at: org.created_at, tone: "success" as const })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)
    .map((notification) => ({
      ...notification,
      relativeLabel: relativeLabel(notification.at, notificationNow),
    }));

  const data: AdminAnalyticsData = {
    range: { from: dateKey(from), to: dateKey(to) },
    metrics: [
      { key: "revenue", label: "Total Revenue", value: totalRevenue, previousValue: previousRevenue, kind: "money", tone: "cyan" },
      { key: "organizations", label: "New Organizations", value: newOrganizations, previousValue: previousOrganizations, kind: "number", tone: "green" },
      { key: "users", label: "New Users", value: newUsers, previousValue: previousUsers, kind: "number", tone: "purple" },
      { key: "bookings", label: "Total Bookings", value: totalBookings, previousValue: previousBookingCount, kind: "number", tone: "orange" },
      { key: "utilization", label: "Court Utilization", value: utilization, previousValue: previousUtilization, kind: "percent", tone: "cyan" },
    ],
    revenueSeries: series,
    bookingsSeries: series.map((point) => ({ date: point.date, value: point.bookings })),
    userGrowthSeries: cumulativeUsers,
    mrc: { totalCents: mrcTotal, previousCents: Math.max(0, mrcTotal - previousUsers * pricing.monthlyPriceCents), rows: enrichedMrcRows },
    revenueByPlan,
    insights: buildInsights(series, totalRevenue, previousRevenue, totalBookings, newOrganizations, utilization),
    notifications,
    demo: false,
  };

  return <AdminAnalytics data={data} />;
}
