import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformRole, ROLE_ACCESS, type PlatformRole } from "@/lib/admin-access";
import {
  AdminUserList,
  type AdminUserListData,
  type AdminUserRow,
  type AdminUserRole,
  type AdminUserStatus,
} from "./admin-user-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

type MemberRow = {
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  deleted_at: string | null;
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

function platformRole(user: AuthUser | undefined, member: MemberRow | undefined): AdminUserRole {
  const saved = text(user?.app_metadata?.platform_role);
  if (isPlatformRole(saved)) {
    return saved;
  }
  if (member?.role === "owner") return "admin";
  return "staff";
}

function accountStatus(user: AuthUser | undefined): AdminUserStatus {
  if (!user) return "active";
  if (text(user.app_metadata?.account_status) === "inactive") return "inactive";
  if (user.banned_until && new Date(user.banned_until) > new Date()) return "inactive";
  return "active";
}

function displayName(user: AuthUser | undefined, fallback: string) {
  const name =
    text(user?.user_metadata?.full_name) ||
    text(user?.user_metadata?.name) ||
    text(user?.user_metadata?.display_name);
  if (name) return name;
  const email = user?.email || fallback;
  return email
    .split("@")[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ") || "Platform User";
}

export default async function AdminUsers({ searchParams }: { searchParams: SearchParams }) {
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
  const [authUsersResult, membersResult, organizationsResult, locationsResult] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase
        .from("org_members")
        .select("user_id, org_id, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("organizations")
        .select("id, name, slug, logo_url, deleted_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("locations").select("org_id, name, address").limit(2000),
    ]);

  const authUsers = (authUsersResult.data?.users ?? []) as AuthUser[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];

  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  const orgById = new Map(organizations.map((organization) => [organization.id, organization]));
  const locationByOrg = new Map<string, LocationRow>();
  ((locationsResult.data ?? []) as LocationRow[]).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) locationByOrg.set(location.org_id, location);
  });

  const latestMemberByUser = new Map<string, MemberRow>();
  members.forEach((member) => {
    if (!latestMemberByUser.has(member.user_id)) latestMemberByUser.set(member.user_id, member);
  });

  const ids = new Set([...authUsers.map((user) => user.id), ...members.map((member) => member.user_id)]);
  const rows: AdminUserRow[] = [...ids].map((id) => {
    const user = authUserById.get(id);
    const member = latestMemberByUser.get(id);
    const organization = member ? orgById.get(member.org_id) : undefined;
    const location = member ? locationByOrg.get(member.org_id) : undefined;
    const joinedAt = user?.created_at || member?.created_at || new Date().toISOString();
    return {
      id,
      email: user?.email || `${id.slice(0, 8)}@unknown.local`,
      name: displayName(user, id),
      avatarUrl: text(user?.user_metadata?.avatar_url) || null,
      role: platformRole(user, member),
      status: accountStatus(user),
      orgId: member?.org_id || "",
      orgName: organization?.name || "No organization assigned",
      orgLocation: location?.address || location?.name || "Location not set",
      orgLogoUrl: organization?.logo_url || null,
      lastActiveAt: user?.last_sign_in_at || user?.created_at || member?.created_at || null,
      joinedAt,
    };
  });
  const superAdminIds = rows.filter((row) => row.role === "super_admin").map((row) => row.id);

  const inRange = (value: string | null) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= from && date <= to;
  };
  const inPreviousRange = (value: string | null) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= previousFrom && date <= previousTo;
  };
  const roleIn = (role: AdminUserRole, keys: AdminUserRole[]) => keys.includes(role);
  const metric = (
    key: string,
    label: string,
    tone: AdminUserListData["metrics"][number]["tone"],
    predicate: (row: AdminUserRow) => boolean,
    detail?: string,
  ) => {
    const matching = rows.filter(predicate);
    const current = matching.filter((row) => inRange(row.joinedAt)).length;
    const previous = matching.filter((row) => inPreviousRange(row.joinedAt)).length;
    return { key, label, value: matching.length, change: current - previous, detail, tone };
  };

  const total = rows.length || 1;
  const active = rows.filter((row) => row.status === "active").length;
  const admins = rows.filter((row) => roleIn(row.role, ["super_admin", "admin"])).length;
  const managers = rows.filter((row) => row.role === "manager").length;
  const inactive = rows.filter((row) => row.status === "inactive").length;

  const notifications = [
    ...rows
      .filter((row) => inRange(row.joinedAt))
      .slice(0, 3)
      .map((row) => ({
        id: `joined-${row.id}`,
        title: "New user joined",
        detail: `${row.name} joined ${row.orgName}`,
        at: row.joinedAt,
      })),
    ...rows
      .filter((row) => row.status === "inactive")
      .slice(0, 3)
      .map((row) => ({
        id: `inactive-${row.id}`,
        title: "Inactive user needs review",
        detail: `${row.name} has inactive access`,
        at: row.lastActiveAt || row.joinedAt,
      })),
    ...rows
      .filter((row) => roleIn(row.role, ["super_admin", "admin"]))
      .slice(0, 3)
      .map((row) => ({
        id: `admin-${row.id}`,
        title: "Admin access active",
        detail: `${row.name} can manage ${row.orgName}`,
        at: row.lastActiveAt || row.joinedAt,
      })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 6);

  const data: AdminUserListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    metrics: [
      metric("total", "Total Users", "cyan", () => true),
      metric(
        "active",
        "Active Users",
        "green",
        (row) => row.status === "active",
        `${((active / total) * 100).toFixed(1)}% of total`,
      ),
      metric(
        "admins",
        "Admins",
        "purple",
        (row) => roleIn(row.role, ["super_admin", "admin"]),
        `${((admins / total) * 100).toFixed(1)}% of total`,
      ),
      metric(
        "managers",
        "Managers",
        "orange",
        (row) => row.role === "manager",
        `${((managers / total) * 100).toFixed(1)}% of total`,
      ),
      metric(
        "inactive",
        "Inactive Users",
        "red",
        (row) => row.status === "inactive",
        `${((inactive / total) * 100).toFixed(1)}% of total`,
      ),
    ],
    users: rows.sort((left, right) => right.joinedAt.localeCompare(left.joinedAt)),
    superAdminUserId: superAdminIds.length === 1 ? superAdminIds[0] ?? null : null,
    roleAccess: Object.entries(ROLE_ACCESS).map(([role, value]) => ({
      role: role as PlatformRole,
      ...value,
    })),
    organizations: organizations
      .filter((organization) => !organization.deleted_at)
      .map((organization) => {
        const location = locationByOrg.get(organization.id);
        return {
          id: organization.id,
          name: organization.name,
          location: location?.address || location?.name || "Location not set",
        };
      }),
    notifications,
    demo: false,
  };

  return <AdminUserList data={data} />;
}
