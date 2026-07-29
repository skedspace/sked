import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminOrgList,
  type OrganizationListData,
  type OrganizationRow,
} from "./admin-org-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SubscriptionRow = {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  created_at: string;
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

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function bookingOrg(payment: { booking: unknown }) {
  const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
  if (!booking || typeof booking !== "object" || !("org_id" in booking)) return null;
  return String(booking.org_id);
}

export default async function AdminOrganizations({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, monthAgo));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const duration = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration + 1);

  const supabase = createAdminClient();
  const [
    orgResult,
    memberResult,
    locationResult,
    subscriptionResult,
    currentBookingsResult,
    previousBookingsResult,
    currentPaymentsResult,
    previousPaymentsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, logo_url, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("org_members").select("org_id, created_at").limit(5000),
    supabase.from("locations").select("org_id, name, address").limit(2000),
    supabase
      .from("subscriptions")
      .select("id, org_id, plan, status, current_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("bookings")
      .select("id, org_id, status, created_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000),
    supabase
      .from("bookings")
      .select("id, org_id, status, created_at")
      .gte("created_at", previousFrom.toISOString())
      .lte("created_at", previousTo.toISOString())
      .limit(10000),
    supabase
      .from("payments")
      .select("id, amount_cents, status, created_at, booking:bookings!inner(org_id)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(10000),
    supabase
      .from("payments")
      .select("id, amount_cents, status, created_at, booking:bookings!inner(org_id)")
      .gte("created_at", previousFrom.toISOString())
      .lte("created_at", previousTo.toISOString())
      .limit(10000),
  ]);

  const organizations = orgResult.data ?? [];

  const members = memberResult.data ?? [];
  const locations = locationResult.data ?? [];
  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];
  const currentBookings = currentBookingsResult.data ?? [];
  const previousBookings = previousBookingsResult.data ?? [];
  const currentPayments = currentPaymentsResult.data ?? [];
  const previousPayments = previousPaymentsResult.data ?? [];

  const latestSubscription = new Map<string, SubscriptionRow>();
  subscriptions.forEach((subscription) => {
    if (!latestSubscription.has(subscription.org_id)) {
      latestSubscription.set(subscription.org_id, subscription);
    }
  });
  const locationByOrg = new Map<string, { name: string; address: string | null }>();
  locations.forEach((location) => {
    if (!locationByOrg.has(location.org_id)) locationByOrg.set(location.org_id, location);
  });

  const countByOrg = <T extends { org_id: string }>(records: T[]) => {
    const counts = new Map<string, number>();
    records.forEach((record) => counts.set(record.org_id, (counts.get(record.org_id) || 0) + 1));
    return counts;
  };
  const membersByOrg = countByOrg(members);
  const currentBookingsByOrg = countByOrg(currentBookings);
  const previousBookingsByOrg = countByOrg(previousBookings);
  const currentMembersByOrg = countByOrg(
    members.filter((member) => new Date(member.created_at) >= from && new Date(member.created_at) <= to),
  );
  const previousMembersByOrg = countByOrg(
    members.filter(
      (member) =>
        new Date(member.created_at) >= previousFrom &&
        new Date(member.created_at) <= previousTo,
    ),
  );
  const revenueByOrg = new Map<string, number>();
  const previousRevenueByOrg = new Map<string, number>();
  currentPayments
    .filter((payment) => payment.status === "succeeded")
    .forEach((payment) => {
      const orgId = bookingOrg(payment);
      if (orgId) revenueByOrg.set(orgId, (revenueByOrg.get(orgId) || 0) + Number(payment.amount_cents));
    });
  previousPayments
    .filter((payment) => payment.status === "succeeded")
    .forEach((payment) => {
      const orgId = bookingOrg(payment);
      if (orgId) {
        previousRevenueByOrg.set(
          orgId,
          (previousRevenueByOrg.get(orgId) || 0) + Number(payment.amount_cents),
        );
      }
    });

  const rows: OrganizationRow[] = organizations.map((organization) => {
    const subscription = latestSubscription.get(organization.id);
    const isTrial = subscription?.plan === "trial" || organization.plan === "free";
    const status: OrganizationRow["status"] =
      organization.deleted_at ||
      subscription?.status === "canceled" ||
      subscription?.status === "expired"
        ? "churned"
        : subscription?.status === "past_due"
          ? "past_due"
          : isTrial
            ? "trial"
            : "active";
    const plan: OrganizationRow["plan"] = isTrial ? "trial" : "premium";
    const end = subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : null;
    const trialDaysLeft =
      status === "trial" && end
        ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000))
        : null;
    const location = locationByOrg.get(organization.id);
    const currentRevenue = revenueByOrg.get(organization.id) || 0;
    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      location: location?.address || location?.name || "Location not set",
      logoUrl: organization.logo_url,
      plan,
      status,
      users: membersByOrg.get(organization.id) || 0,
      userChange:
        (currentMembersByOrg.get(organization.id) || 0) -
        (previousMembersByOrg.get(organization.id) || 0),
      bookings: currentBookingsByOrg.get(organization.id) || 0,
      bookingChange:
        (currentBookingsByOrg.get(organization.id) || 0) -
        (previousBookingsByOrg.get(organization.id) || 0),
      revenue: currentRevenue,
      revenueChange: percentChange(
        currentRevenue,
        previousRevenueByOrg.get(organization.id) || 0,
      ),
      trialDaysLeft,
      createdAt: organization.created_at,
    };
  });

  const category = (row: OrganizationRow, key: string) =>
    key === "total" ||
    (key === "premium" ? row.plan === "premium" && row.status === "active" : row.status === key);
  const metric = (
    key: string,
    label: string,
    tone: OrganizationListData["metrics"][number]["tone"],
  ) => {
    const value = rows.filter((row) => category(row, key)).length;
    const currentCreated = rows.filter(
      (row) =>
        category(row, key) &&
        new Date(row.createdAt) >= from &&
        new Date(row.createdAt) <= to,
    ).length;
    const previousCreated = rows.filter(
      (row) =>
        category(row, key) &&
        new Date(row.createdAt) >= previousFrom &&
        new Date(row.createdAt) <= previousTo,
    ).length;
    return { key, label, value, change: currentCreated - previousCreated, tone };
  };

  const notifications = [
    ...rows.slice(0, 4).map((row) => ({
      id: `organization-${row.id}`,
      title: "New organization registered",
      detail: row.name,
      at: row.createdAt,
    })),
    ...rows
      .filter((row) => row.status === "past_due" || row.status === "churned")
      .slice(0, 3)
      .map((row) => ({
        id: `status-${row.id}`,
        title: row.status === "past_due" ? "Subscription past due" : "Organization churned",
        detail: row.name,
        at: row.createdAt,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const data: OrganizationListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    metrics: [
      metric("total", "Total Organizations", "cyan"),
      metric("active", "Active Organizations", "green"),
      metric("premium", "Premium Organizations", "purple"),
      metric("trial", "Trial Organizations", "orange"),
      metric("churned", "Churned Organizations", "red"),
    ],
    organizations: rows,
    notifications,
    demo: false,
  };

  return <AdminOrgList data={data} />;
}
