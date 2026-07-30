import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type MemberRow = {
  org_id: string;
  user_id: string;
  role: string;
};

type SubscriptionRow = {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  canceled_at: string | null;
  updated_at: string;
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

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function name(user: AuthUser | undefined, fallback: string) {
  return text(user?.user_metadata?.full_name) || text(user?.user_metadata?.name) || user?.email || fallback;
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

  const [organizations, subscriptions, members, locations, config, authUsers] = await Promise.all([
    supabase.from("organizations").select("id, name, slug, plan, created_at, deleted_at").limit(5000),
    supabase
      .from("subscriptions")
      .select("id, org_id, plan, status, current_period_end, canceled_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase.from("org_members").select("org_id, user_id, role").limit(20000),
    supabase.from("locations").select("org_id, name, address").limit(5000),
    supabase.from("app_config").select("key, value").eq("key", "monthly_price_cents").maybeSingle(),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const monthlyPriceCents =
    Number(config.data?.value) > 0 ? Number(config.data?.value) : DEFAULT_MONTHLY_PRICE_CENTS;
  const latestSubscription = new Map<string, SubscriptionRow>();
  ((subscriptions.data ?? []) as SubscriptionRow[]).forEach((subscription) => {
    if (!latestSubscription.has(subscription.org_id)) latestSubscription.set(subscription.org_id, subscription);
  });
  const membersByOrg = new Map<string, MemberRow[]>();
  ((members.data ?? []) as MemberRow[]).forEach((member) => {
    membersByOrg.set(member.org_id, [...(membersByOrg.get(member.org_id) ?? []), member]);
  });
  const locationByOrg = new Map<string, string>();
  (locations.data ?? []).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) {
      locationByOrg.set(location.org_id, location.address || location.name || "");
    }
  });
  const userById = new Map(((authUsers.data?.users ?? []) as AuthUser[]).map((user) => [user.id, user]));

  const rows = [
    ["organization_id", "organization", "slug", "location", "owner", "owner_email", "subscription", "status", "trial_days_left", "renewal_date", "monthly_fee_cents", "auto_renew", "updated_at"],
    ...(organizations.data ?? [])
      .filter((organization) => !organization.deleted_at)
      .map((organization) => {
        const subscription = latestSubscription.get(organization.id);
        const plan = subscription?.plan || (organization.plan === "free" ? "trial" : "monthly");
        const renewalDate = subscription?.current_period_end || organization.created_at;
        const status =
          subscription?.status === "past_due" || subscription?.status === "expired"
            ? subscription.status
            : plan === "trial"
              ? "trial"
              : "active";
        const trialDaysLeft =
          plan === "trial" && status === "trial"
            ? Math.max(0, Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86_400_000))
            : "";
        const ownerMember =
          membersByOrg.get(organization.id)?.find((member) => member.role === "owner") ??
          membersByOrg.get(organization.id)?.[0];
        const owner = ownerMember ? userById.get(ownerMember.user_id) : undefined;
        return [
          organization.id,
          organization.name,
          organization.slug,
          locationByOrg.get(organization.id) || "",
          name(owner, ""),
          owner?.email || "",
          plan === "monthly" ? "Premium" : "Trial",
          status,
          trialDaysLeft,
          renewalDate,
          plan === "monthly" ? monthlyPriceCents : 0,
          plan === "monthly" && !subscription?.canceled_at ? "on" : "off",
          subscription?.updated_at || organization.created_at,
        ];
      })
      .filter((row) => {
        const updatedAt = String(row[12] || "");
        if (!updatedAt) return true;
        const updated = new Date(updatedAt);
        return updated >= from && updated <= to;
      }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-subscriptions-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
