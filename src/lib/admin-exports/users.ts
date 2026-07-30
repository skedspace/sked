import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function role(user: AuthUser | undefined, member: MemberRow | undefined) {
  const saved = text(user?.app_metadata?.platform_role);
  if (saved) return saved;
  return member?.role === "owner" ? "admin" : "staff";
}

function name(user: AuthUser | undefined, fallback: string) {
  return (
    text(user?.user_metadata?.full_name) ||
    text(user?.user_metadata?.name) ||
    user?.email ||
    fallback
  );
}

function status(user: AuthUser | undefined) {
  if (!user) return "active";
  if (text(user.app_metadata?.account_status) === "inactive") return "inactive";
  if (user.banned_until && new Date(user.banned_until) > new Date()) return "inactive";
  return "active";
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

  const [authUsersResult, membersResult, organizationsResult, locationsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("org_members").select("user_id, org_id, role, created_at").limit(20000),
    supabase.from("organizations").select("id, name, slug").limit(5000),
    supabase.from("locations").select("org_id, name, address").limit(5000),
  ]);

  const authUsers = (authUsersResult.data?.users ?? []) as AuthUser[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const orgById = new Map(
    (organizationsResult.data ?? []).map((organization) => [organization.id, organization]),
  );
  const locationByOrg = new Map<string, string>();
  (locationsResult.data ?? []).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) {
      locationByOrg.set(location.org_id, location.address || location.name || "");
    }
  });
  const memberByUser = new Map<string, MemberRow>();
  members.forEach((member) => {
    if (!memberByUser.has(member.user_id)) memberByUser.set(member.user_id, member);
  });
  const ids = new Set([...authUsers.map((user) => user.id), ...members.map((member) => member.user_id)]);

  const rows = [
    ["user_id", "name", "email", "role", "status", "organization", "organization_slug", "location", "last_active_at", "joined_at"],
    ...[...ids]
      .map((id) => {
        const user = authById.get(id);
        const member = memberByUser.get(id);
        const organization = member ? orgById.get(member.org_id) : undefined;
        const joinedAt = user?.created_at || member?.created_at || "";
        return {
          id,
          name: name(user, id),
          email: user?.email || "",
          role: role(user, member),
          status: status(user),
          organization: organization?.name || "",
          slug: organization?.slug || "",
          location: member ? locationByOrg.get(member.org_id) || "" : "",
          lastActiveAt: user?.last_sign_in_at || "",
          joinedAt,
        };
      })
      .filter((row) => {
        if (!row.joinedAt) return true;
        const joined = new Date(row.joinedAt);
        return joined >= from && joined <= to;
      })
      .map((row) => [
        row.id,
        row.name,
        row.email,
        row.role,
        row.status,
        row.organization,
        row.slug,
        row.location,
        row.lastActiveAt,
        row.joinedAt,
      ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-users-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
