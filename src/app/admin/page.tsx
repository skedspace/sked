import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { AdminOverview, type AdminDashboardData } from "./admin-overview";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type OrgRow = { id: string; name: string; slug: string; plan: string; logo_url: string | null; created_at: string };
type MemberRow = { org_id: string; user_id: string; role: string; created_at: string };
type BookingRow = { id: string; org_id: string; resource_id: string; customer_id: string; status: string; price_cents: number; time_range: unknown; created_at: string };
type PaymentRow = { id: string; booking_id: string; amount_cents: number; status: string; created_at: string };
type SubscriptionRow = { id: string; org_id: string; plan: string; status: string; current_period_end: string; created_at: string; updated_at: string };
type InvoiceRow = { id: string; subscription_id: string; amount_cents: number; status: string; paid_at: string | null; created_at: string };
type ResourceRow = { id: string; org_id: string; name: string };
type CustomerRow = { id: string; org_id: string; name: string; email: string | null };
type LocationRow = { id: string; org_id: string; name: string; address: string | null };
type AuditRow = { id: number; org_id: string; action: string; target: string | null; payload: unknown; created_at: string };
type DiscountRow = { id: string; expires_at: string | null; is_active: boolean };
type CampaignRow = { id: string; ends_at: string; status: string };

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = Array.isArray(value) ? value[0] : value;
  const date = raw ? new Date(`${raw}T00:00:00`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeRangeStart(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/[\[(]"?([^",]+)"?/);
  return match?.[1] ?? null;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const from = startOfDay(asDate(params.from, defaultStart));
  const to = endOfDay(asDate(params.to, today));
  const safeFrom = from <= to ? from : to;
  const safeTo = from <= to ? to : from;
  const periodMs = safeTo.getTime() - safeFrom.getTime() + 1;
  const previousTo = new Date(safeFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs + 1);

  const supabase = createAdminClient();
  const currentFrom = safeFrom.toISOString();
  const currentTo = safeTo.toISOString();
  const prevFrom = previousFrom.toISOString();
  const prevTo = previousTo.toISOString();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const threeDaysFromNow = endOfDay(new Date(now.getTime() + 3 * 86_400_000));
  const weekFromNow = endOfDay(new Date(now.getTime() + 7 * 86_400_000));
  const inactiveCutoff = new Date(now.getTime() - 30 * 86_400_000);

  const [
    orgResult,
    memberResult,
    bookingResult,
    paymentResult,
    subscriptionResult,
    invoiceResult,
    resourceResult,
    customerResult,
    locationResult,
    auditResult,
    configResult,
    bookingCountResult,
    previousBookingCountResult,
    previousPaymentResult,
    authUsersResult,
    recentOrgActivityResult,
    discountResult,
    campaignResult,
    recentBookingActivityResult,
    recentPaymentActivityResult,
    recentInvoiceActivityResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id, name, slug, plan, logo_url, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
    supabase.from("org_members").select("org_id, user_id, role, created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("bookings").select("id, org_id, resource_id, customer_id, status, price_cents, time_range, created_at").gte("created_at", currentFrom).lte("created_at", currentTo).order("created_at", { ascending: false }).limit(1000),
    supabase.from("payments").select("id, booking_id, amount_cents, status, created_at").gte("created_at", currentFrom).lte("created_at", currentTo).order("created_at", { ascending: false }).limit(1000),
    supabase.from("subscriptions").select("id, org_id, plan, status, current_period_end, created_at, updated_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("subscription_invoices").select("id, subscription_id, amount_cents, status, paid_at, created_at").gte("created_at", currentFrom).lte("created_at", currentTo).order("created_at", { ascending: false }).limit(1000),
    supabase.from("resources").select("id, org_id, name").limit(1000),
    supabase.from("customers").select("id, org_id, name, email").limit(1000),
    supabase.from("locations").select("id, org_id, name, address").limit(1000),
    supabase.from("audit_log").select("id, org_id, action, target, payload, created_at").order("created_at", { ascending: false }).limit(40),
    supabase.from("app_config").select("key, value"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", currentFrom).lte("created_at", currentTo),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", prevFrom).lte("created_at", prevTo),
    supabase.from("payments").select("amount_cents, status").gte("created_at", prevFrom).lte("created_at", prevTo).eq("status", "succeeded"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("bookings").select("org_id").gte("created_at", inactiveCutoff.toISOString()).limit(5000),
    supabase.from("discount_codes").select("id, expires_at, is_active").eq("is_active", true).gte("expires_at", now.toISOString()).lte("expires_at", weekFromNow.toISOString()).limit(1000),
    supabase.from("campaigns").select("id, ends_at, status").eq("status", "active").gte("ends_at", now.toISOString()).lte("ends_at", weekFromNow.toISOString()).limit(1000),
    supabase.from("bookings").select("id, org_id, resource_id, customer_id, status, price_cents, time_range, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("id, booking_id, amount_cents, status, created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("subscription_invoices").select("id, subscription_id, amount_cents, status, paid_at, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);

  const orgs = (orgResult.data ?? []) as OrgRow[];
  const members = (memberResult.data ?? []) as MemberRow[];
  const bookings = (bookingResult.data ?? []) as BookingRow[];
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];
  const invoices = (invoiceResult.data ?? []) as InvoiceRow[];
  const resources = (resourceResult.data ?? []) as ResourceRow[];
  const customers = (customerResult.data ?? []) as CustomerRow[];
  const locations = (locationResult.data ?? []) as LocationRow[];
  const audits = (auditResult.data ?? []) as AuditRow[];
  const discountsEnding = (discountResult.data ?? []) as DiscountRow[];
  const campaignsEnding = (campaignResult.data ?? []) as CampaignRow[];
  const recentBookingActivity = (recentBookingActivityResult.data ?? []) as BookingRow[];
  const recentPaymentActivity = (recentPaymentActivityResult.data ?? []) as PaymentRow[];
  const recentInvoiceActivity = (recentInvoiceActivityResult.data ?? []) as InvoiceRow[];
  const configRows = (configResult.data ?? []) as Array<{ key: string; value: string }>;

  const orgById = new Map(orgs.map((row) => [row.id, row]));
  const bookingById = new Map(bookings.map((row) => [row.id, row]));
  recentBookingActivity.forEach((row) => bookingById.set(row.id, row));
  const resourceById = new Map(resources.map((row) => [row.id, row]));
  const customerById = new Map(customers.map((row) => [row.id, row]));
  const locationByOrg = new Map<string, LocationRow>();
  locations.forEach((row) => {
    if (!locationByOrg.has(row.org_id)) locationByOrg.set(row.org_id, row);
  });
  const subscriptionByOrg = new Map<string, SubscriptionRow>();
  const subscriptionById = new Map(subscriptions.map((row) => [row.id, row]));
  subscriptions.forEach((row) => {
    if (!subscriptionByOrg.has(row.org_id)) subscriptionByOrg.set(row.org_id, row);
  });
  const config = Object.fromEntries(configRows.map((row) => [row.key, row.value]));
  const monthlyPrice = Number(config.monthly_price_cents || DEFAULT_MONTHLY_PRICE_CENTS);

  const paidPayments = payments.filter((row) => row.status === "succeeded");
  const paidInvoices = invoices.filter((row) => row.status === "paid");
  const revenueEvents = [
    ...paidPayments.map((row) => ({
      date: row.created_at as string,
      amount: Number(row.amount_cents ?? 0),
      source: "Booking payment",
    })),
    ...paidInvoices.map((row) => ({
      date: (row.paid_at || row.created_at) as string,
      amount: Number(row.amount_cents ?? 0),
      source: "Subscription invoice",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const previousRevenue = ((previousPaymentResult.data ?? []) as Array<{ amount_cents: number }>).reduce(
    (sum, row) => sum + Number(row.amount_cents ?? 0),
    0,
  );
  const currentRevenue = revenueEvents.reduce((sum, row) => sum + row.amount, 0);
  const activeSubscriptions = subscriptions.filter((row) => row.status === "active");
  const mrr = activeSubscriptions.reduce((sum, row) => {
    const invoice = [...invoices].find((item) => item.subscription_id === row.id && item.status === "paid");
    return sum + Number(invoice?.amount_cents ?? monthlyPrice);
  }, 0);

  const authUsers = authUsersResult.data?.users ?? [];
  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  const uniqueMembers = new Set(members.map((row) => row.user_id));
  const activeUsers = authUsers.length
    ? authUsers.filter((user) => {
        const stamp = user.last_sign_in_at || user.created_at;
        return stamp && new Date(stamp) >= safeFrom && new Date(stamp) <= safeTo;
      }).length
    : uniqueMembers.size;
  const usersTotal = authUsers.length || uniqueMembers.size;

  const planCounts = orgs.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.plan || "trial");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const converted = (planCounts.monthly || 0) + (planCounts.pro || 0);
  const trials = planCounts.trial || planCounts.free || 0;
  const conversion = converted + trials > 0 ? (converted / (converted + trials)) * 100 : 0;

  const cohortTrials = subscriptions.filter((row) => {
    const created = new Date(row.created_at);
    return row.plan === "trial" && created >= safeFrom && created <= safeTo;
  });
  const cohortOrgIds = new Set(cohortTrials.map((row) => row.org_id));
  const paidOrgIds = new Set(
    subscriptions
      .filter((row) => row.plan !== "trial" && row.status === "active")
      .map((row) => row.org_id),
  );
  const latestTrialByOrg = new Map<string, SubscriptionRow>();
  cohortTrials.forEach((row) => {
    if (!latestTrialByOrg.has(row.org_id)) latestTrialByOrg.set(row.org_id, row);
  });
  const cohortRows = [...latestTrialByOrg.values()];
  const trialStarted = cohortOrgIds.size;
  const activeTrial = cohortRows.filter(
    (row) =>
      row.status === "active" &&
      new Date(row.current_period_end) > now &&
      !paidOrgIds.has(row.org_id),
  ).length;
  const trialExpiring = cohortRows.filter(
    (row) =>
      row.status === "active" &&
      !paidOrgIds.has(row.org_id) &&
      new Date(row.current_period_end) >= now &&
      new Date(row.current_period_end) <= threeDaysFromNow,
  ).length;
  const trialConverted = [...cohortOrgIds].filter((orgId) => paidOrgIds.has(orgId)).length;
  const trialChurned = cohortRows.filter(
    (row) =>
      !paidOrgIds.has(row.org_id) &&
      (row.status === "canceled" ||
        row.status === "expired" ||
        new Date(row.current_period_end) < now),
  ).length;

  const trialsExpiringToday = subscriptions.filter(
    (row) =>
      row.plan === "trial" &&
      row.status === "active" &&
      new Date(row.current_period_end) >= todayStart &&
      new Date(row.current_period_end) <= todayEnd,
  ).length;
  const trialsExpiringSoon = subscriptions.filter(
    (row) =>
      row.plan === "trial" &&
      row.status === "active" &&
      new Date(row.current_period_end) > todayEnd &&
      new Date(row.current_period_end) <= threeDaysFromNow,
  ).length;
  const latestPaymentByBooking = new Map<string, PaymentRow>();
  recentPaymentActivity.forEach((row) => {
    if (!latestPaymentByBooking.has(row.booking_id)) {
      latestPaymentByBooking.set(row.booking_id, row);
    }
  });
  const failedPayments = [...latestPaymentByBooking.values()].filter(
    (row) => row.status === "failed",
  );
  const failedInvoices = recentInvoiceActivity.filter((row) => row.status === "failed");
  const failedPaymentCount = failedPayments.length + failedInvoices.length;
  const failedPaymentTotal = [
    ...failedPayments.map((row) => Number(row.amount_cents ?? 0)),
    ...failedInvoices.map((row) => Number(row.amount_cents ?? 0)),
  ].reduce((sum, amount) => sum + amount, 0);
  const recentlyActiveOrgIds = new Set(
    ((recentOrgActivityResult.data ?? []) as Array<{ org_id: string }>).map((row) => row.org_id),
  );
  const inactiveOrganizations = orgs.filter(
    (row) =>
      new Date(row.created_at) < inactiveCutoff &&
      !recentlyActiveOrgIds.has(row.id),
  ).length;
  const promotionsEnding = discountsEnding.length + campaignsEnding.length;
  const pastDueSubscriptions = subscriptions.filter((row) => row.status === "past_due").length;
  const dataQueries = [
    orgResult,
    memberResult,
    bookingResult,
    paymentResult,
    subscriptionResult,
    invoiceResult,
    resourceResult,
    customerResult,
    locationResult,
    auditResult,
    configResult,
    recentOrgActivityResult,
    discountResult,
    campaignResult,
    recentBookingActivityResult,
    recentPaymentActivityResult,
    recentInvoiceActivityResult,
    bookingCountResult,
    previousBookingCountResult,
    previousPaymentResult,
  ];
  const systemHealthy =
    dataQueries.every((result) => !result.error) &&
    !authUsersResult.error;

  const activities: AdminDashboardData["activities"] = [];
  const pushActivity = (
    id: string,
    type: AdminDashboardData["activities"][number]["type"],
    title: string,
    detail: string,
    at: string,
  ) => activities.push({ id, type, title, detail, at });

  orgs.slice(0, 12).forEach((row) =>
    pushActivity(`org-${row.id}`, "organization", "New organization registered", row.name, row.created_at),
  );
  members.slice(0, 12).forEach((row) =>
    pushActivity(
      `member-${row.user_id}-${row.org_id}`,
      "user",
      "User joined",
      `${authUserById.get(row.user_id)?.email || row.user_id.slice(0, 8)} joined ${orgById.get(row.org_id)?.name || "an organization"} as ${row.role}`,
      row.created_at,
    ),
  );
  recentPaymentActivity
    .filter((row) => ["succeeded", "failed", "refunded"].includes(row.status))
    .slice(0, 20)
    .forEach((row) => {
      const booking = bookingById.get(row.booking_id);
      const org = booking ? orgById.get(booking.org_id) : null;
      const paymentTitles: Record<string, string> = {
        succeeded: "Payment received",
        failed: "Payment failed",
        refunded: "Payment refunded",
      };
      pushActivity(
        `payment-${row.id}`,
        row.status === "failed" ? "failed" : "payment",
        paymentTitles[row.status] || "Payment updated",
        `₱${(Number(row.amount_cents) / 100).toLocaleString("en-PH")}${org ? ` • ${org.name}` : ""}`,
        row.created_at,
      );
    });
  recentBookingActivity
    .filter((row) => ["confirmed", "completed", "cancelled", "no_show"].includes(row.status))
    .slice(0, 20)
    .forEach((row) =>
      pushActivity(
        `booking-${row.id}`,
        "booking",
        `Booking ${String(row.status).replaceAll("_", " ")}`,
        `${customerById.get(row.customer_id)?.name || "Guest"} • ${resourceById.get(row.resource_id)?.name || "Court"} at ${orgById.get(row.org_id)?.name || "Organization"}`,
        row.created_at,
      ),
    );
  subscriptions.slice(0, 20).forEach((row) => {
    const title =
      row.status === "past_due"
        ? "Subscription past due"
        : row.status === "canceled" || row.status === "expired"
          ? `Subscription ${row.status}`
          : row.plan === "trial"
            ? "Trial started"
            : "Subscription activated";
    pushActivity(
      `subscription-${row.id}`,
      row.status === "past_due" ? "failed" : "subscription",
      title,
      `${orgById.get(row.org_id)?.name || "Organization"} • ${row.plan} plan`,
      row.updated_at || row.created_at,
    );
  });
  recentInvoiceActivity
    .filter((row) => ["paid", "failed", "refunded"].includes(row.status))
    .slice(0, 20)
    .forEach((row) => {
      const subscription = subscriptionById.get(row.subscription_id);
      const org = subscription ? orgById.get(subscription.org_id) : null;
      pushActivity(
        `invoice-${row.id}`,
        row.status === "failed" ? "failed" : "subscription",
        `Subscription invoice ${row.status}`,
        `₱${(Number(row.amount_cents) / 100).toLocaleString("en-PH")}${org ? ` • ${org.name}` : ""}`,
        row.paid_at || row.created_at,
      );
    });
  audits
    .filter(
      (row) =>
        !row.action.startsWith("payment.") &&
        !row.action.startsWith("booking."),
    )
    .slice(0, 20)
    .forEach((row) =>
      pushActivity(
        `audit-${row.id}`,
        "audit",
        String(row.action).replaceAll("_", " "),
        row.target || orgById.get(row.org_id)?.name || "Platform update",
        row.created_at,
      ),
    );
  activities.sort((a, b) => b.at.localeCompare(a.at));

  const data: AdminDashboardData = {
    range: {
      from: localDateKey(safeFrom),
      to: localDateKey(safeTo),
    },
    metrics: {
      organizations: orgs.length,
      organizationDelta: orgs.filter((row) => new Date(row.created_at) >= safeFrom && new Date(row.created_at) <= safeTo).length,
      activeUsers,
      usersTotal,
      bookings: bookingCountResult.count ?? bookings.length,
      bookingChange: percentChange(bookingCountResult.count ?? bookings.length, previousBookingCountResult.count ?? 0),
      mrr,
      revenueChange: percentChange(currentRevenue, previousRevenue),
      conversion,
      converted,
    },
    planDistribution: Object.entries(planCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    revenueEvents,
    needsAttention: {
      total:
        trialsExpiringToday +
        trialsExpiringSoon +
        failedPaymentCount +
        pastDueSubscriptions +
        inactiveOrganizations +
        promotionsEnding +
        (systemHealthy ? 0 : 1),
      trialsExpiringToday,
      trialsExpiringSoon,
      failedPaymentCount,
      failedPaymentTotal,
      pastDueSubscriptions,
      inactiveOrganizations,
      promotionsEnding,
      systemHealthy,
    },
    trialFunnel: {
      started: trialStarted,
      active: activeTrial,
      expiring: trialExpiring,
      converted: trialConverted,
      churned: trialChurned,
    },
    recentOrganizations: orgs.slice(0, 6).map((row) => {
      const sub = subscriptionByOrg.get(row.id);
      const location = locationByOrg.get(row.id);
      return {
        id: row.id,
        name: row.name,
        location: location?.address || location?.name || "Location not set",
        logoUrl: row.logo_url,
        plan: row.plan || sub?.plan || "trial",
        status: sub?.status || (row.plan === "trial" ? "trial" : "active"),
        joinedAt: row.created_at,
      };
    }),
    recentBookings: bookings.slice(0, 6).map((row) => {
      const customer = customerById.get(row.customer_id);
      return {
        id: row.id,
        organization: orgById.get(row.org_id)?.name || "Unknown organization",
        resource: resourceById.get(row.resource_id)?.name || "Court",
        customer: customer?.name || customer?.email || "Guest",
        status: row.status,
        startsAt: timeRangeStart(row.time_range) || row.created_at,
      };
    }),
    activities: activities.slice(0, 12),
  };

  return <AdminOverview data={data} />;
}
