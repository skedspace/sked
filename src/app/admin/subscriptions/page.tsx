import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminSubscriptionList,
  type AdminSubscriptionListData,
  type AdminSubscriptionRow,
  type SubscriptionStatus,
} from "./admin-subscription-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url: string | null;
  created_at: string;
  deleted_at: string | null;
};

type SubscriptionRow = {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  org_id: string;
  user_id: string;
  role: string;
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

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function displayName(user: AuthUser | undefined, fallback: string) {
  return (
    text(user?.user_metadata?.full_name) ||
    text(user?.user_metadata?.name) ||
    user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    fallback
  );
}

function normalizedStatus(subscription: SubscriptionRow): SubscriptionStatus {
  if (subscription.status === "past_due") return "past_due";
  if (subscription.status === "expired") return "expired";
  if (subscription.status === "canceled") return "expired";
  if (subscription.plan === "trial") return "trial";
  return "active";
}

export default async function AdminSubscriptions({
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
    organizationResult,
    subscriptionResult,
    memberResult,
    locationResult,
    configResult,
    authUsersResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, logo_url, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("subscriptions")
      .select("id, org_id, plan, status, current_period_start, current_period_end, canceled_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("org_members")
      .select("org_id, user_id, role, created_at")
      .order("created_at", { ascending: true })
      .limit(5000),
    supabase.from("locations").select("org_id, name, address").limit(2000),
    supabase.from("app_config").select("key, value").eq("key", "monthly_price_cents").maybeSingle(),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const monthlyPriceCents =
    Number(configResult.data?.value) > 0
      ? Number(configResult.data?.value)
      : DEFAULT_MONTHLY_PRICE_CENTS;
  const organizations = (organizationResult.data ?? []) as OrganizationRow[];
  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];

  const latestSubscription = new Map<string, SubscriptionRow>();
  subscriptions.forEach((subscription) => {
    if (!latestSubscription.has(subscription.org_id)) latestSubscription.set(subscription.org_id, subscription);
  });
  const membersByOrg = new Map<string, MemberRow[]>();
  ((memberResult.data ?? []) as MemberRow[]).forEach((member) => {
    membersByOrg.set(member.org_id, [...(membersByOrg.get(member.org_id) ?? []), member]);
  });
  const locationByOrg = new Map<string, LocationRow>();
  ((locationResult.data ?? []) as LocationRow[]).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) locationByOrg.set(location.org_id, location);
  });
  const users = (authUsersResult.data?.users ?? []) as AuthUser[];
  const userById = new Map(users.map((user) => [user.id, user]));

  const rows: AdminSubscriptionRow[] = organizations
    .filter((organization) => !organization.deleted_at)
    .map((organization) => {
      const subscription = latestSubscription.get(organization.id);
      const fallbackTrialEnd = new Date(organization.created_at);
      fallbackTrialEnd.setDate(fallbackTrialEnd.getDate() + 14);
      const effectiveSubscription: SubscriptionRow =
        subscription ?? {
          id: `virtual-${organization.id}`,
          org_id: organization.id,
          plan: organization.plan === "free" ? "trial" : "monthly",
          status: "active",
          current_period_start: organization.created_at,
          current_period_end: fallbackTrialEnd.toISOString(),
          canceled_at: null,
          created_at: organization.created_at,
          updated_at: organization.created_at,
        };
      const ownerMember =
        membersByOrg.get(organization.id)?.find((member) => member.role === "owner") ??
        membersByOrg.get(organization.id)?.[0];
      const owner = ownerMember ? userById.get(ownerMember.user_id) : undefined;
      const location = locationByOrg.get(organization.id);
      const status = normalizedStatus(effectiveSubscription);
      const plan = effectiveSubscription.plan === "trial" ? "trial" : "monthly";
      const trialDaysLeft =
        plan === "trial" && status === "trial"
          ? Math.max(
              0,
              Math.ceil((new Date(effectiveSubscription.current_period_end).getTime() - Date.now()) / 86_400_000),
            )
          : null;
      return {
        id: effectiveSubscription.id,
        orgId: organization.id,
        orgSlug: organization.slug,
        orgName: organization.name,
        orgLocation: location?.address || location?.name || "Location not set",
        orgLogoUrl: organization.logo_url,
        ownerName: displayName(owner, "No owner assigned"),
        ownerEmail: owner?.email || "owner not set",
        ownerAvatarUrl: text(owner?.user_metadata?.avatar_url) || null,
        plan,
        status,
        trialDaysLeft,
        renewalDate: effectiveSubscription.current_period_end,
        monthlyFeeCents: plan === "monthly" ? monthlyPriceCents : 0,
        autoRenew: plan === "monthly" && !effectiveSubscription.canceled_at && status !== "expired",
        updatedAt: effectiveSubscription.updated_at || effectiveSubscription.created_at,
      };
    });

  const currentCreated = (predicate: (row: AdminSubscriptionRow) => boolean) =>
    rows.filter((row) => predicate(row) && new Date(row.updatedAt) >= from && new Date(row.updatedAt) <= to).length;
  const previousCreated = (predicate: (row: AdminSubscriptionRow) => boolean) =>
    rows.filter((row) => predicate(row) && new Date(row.updatedAt) >= previousFrom && new Date(row.updatedAt) <= previousTo).length;
  const metric = (
    key: string,
    label: string,
    tone: AdminSubscriptionListData["metrics"][number]["tone"],
    predicate: (row: AdminSubscriptionRow) => boolean,
    detail?: string,
  ) => ({
    key,
    label,
    value: rows.filter(predicate).length,
    change: currentCreated(predicate) - previousCreated(predicate),
    detail,
    tone,
  });
  const activePremium = (row: AdminSubscriptionRow) => row.plan === "monthly" && row.status === "active";
  const activeTrials = (row: AdminSubscriptionRow) => row.plan === "trial" && row.status === "trial";
  const expiring = (row: AdminSubscriptionRow) =>
    row.plan === "trial" && row.status === "trial" && row.trialDaysLeft !== null && row.trialDaysLeft <= 7;
  const pastDue = (row: AdminSubscriptionRow) => row.status === "past_due";
  const mrr = rows.filter(activePremium).reduce((sum, row) => sum + row.monthlyFeeCents, 0);

  const notifications = [
    ...rows
      .filter((row) => row.trialDaysLeft !== null && row.trialDaysLeft <= 7)
      .slice(0, 3)
      .map((row) => ({
        id: `trial-${row.id}`,
        title: row.trialDaysLeft === 0 ? "Trial ends today" : "Trial expiring soon",
        detail: `${row.orgName} has ${row.trialDaysLeft} day${row.trialDaysLeft === 1 ? "" : "s"} left`,
        at: row.updatedAt,
      })),
    ...rows
      .filter(pastDue)
      .slice(0, 3)
      .map((row) => ({
        id: `past-due-${row.id}`,
        title: "Past due payment",
        detail: `${row.orgName} renewal needs follow-up`,
        at: row.updatedAt,
      })),
    ...rows
      .filter((row) => row.plan === "monthly" && !row.autoRenew)
      .slice(0, 3)
      .map((row) => ({
        id: `renew-off-${row.id}`,
        title: "Auto renew disabled",
        detail: `${row.orgName} will not renew automatically`,
        at: row.updatedAt,
      })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 6);

  const data: AdminSubscriptionListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    monthlyPriceCents,
    metrics: [
      metric("premium", "Active Premium", "cyan", activePremium),
      metric("trials", "Active Trials", "orange", activeTrials),
      metric("expiring", "Trials Expiring", "purple", expiring, "Next 7 days"),
      { key: "mrr", label: "Monthly Recurring Revenue", value: mrr, change: 0, money: true, tone: "green" },
      metric("past_due", "Past Due Payments", "red", pastDue),
    ],
    subscriptions: rows.sort((left, right) => {
      const statusWeight: Record<SubscriptionStatus, number> = { past_due: 0, trial: 1, active: 2, expired: 3 };
      return statusWeight[left.status] - statusWeight[right.status] || left.renewalDate.localeCompare(right.renewalDate);
    }),
    organizations: organizations
      .filter((organization) => !organization.deleted_at)
      .map((organization) => ({ id: organization.id, name: organization.name })),
    notifications,
    demo: false,
  };

  return <AdminSubscriptionList data={data} />;
}
