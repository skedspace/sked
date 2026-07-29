import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ExportSubscription = {
  org_id: string;
  plan: string;
  status: string;
  current_period_end: string;
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

  const [organizations, members, subscriptions, bookings] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, contact_email, contact_phone, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("org_members").select("org_id").limit(20000),
    supabase
      .from("subscriptions")
      .select("org_id, plan, status, current_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("bookings")
      .select("org_id")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(50000),
  ]);

  const membersByOrg = new Map<string, number>();
  (members.data ?? []).forEach((row) =>
    membersByOrg.set(row.org_id, (membersByOrg.get(row.org_id) || 0) + 1),
  );
  const bookingsByOrg = new Map<string, number>();
  (bookings.data ?? []).forEach((row) =>
    bookingsByOrg.set(row.org_id, (bookingsByOrg.get(row.org_id) || 0) + 1),
  );
  const subscriptionByOrg = new Map<string, ExportSubscription>();
  ((subscriptions.data ?? []) as ExportSubscription[]).forEach((row) => {
    if (!subscriptionByOrg.has(row.org_id)) subscriptionByOrg.set(row.org_id, row);
  });

  const rows = [
    ["organization_id", "name", "slug", "plan", "status", "users", "bookings_in_period", "trial_or_period_end", "contact_email", "contact_phone", "created_at"],
    ...(organizations.data ?? []).map((organization) => {
      const subscription = subscriptionByOrg.get(organization.id);
      const plan =
        subscription?.plan === "trial" || organization.plan === "free"
          ? "Trial"
          : "Premium";
      return [
        organization.id,
        organization.name,
        organization.slug,
        plan,
        organization.deleted_at ? "churned" : subscription?.status || "active",
        membersByOrg.get(organization.id) || 0,
        bookingsByOrg.get(organization.id) || 0,
        subscription?.current_period_end || "",
        organization.contact_email,
        organization.contact_phone,
        organization.created_at,
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-organizations-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
