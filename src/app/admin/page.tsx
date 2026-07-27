import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminOverview } from "./admin-overview";

// Cache data fetches across the component tree
const getStats = cache(async () => {
  const supabase = createAdminClient();

  const [
    { count: orgCount },
    { count: userCount },
    { count: bookingCount },
    { count: paidBookings },
    revenueResult,
    planResult,
    { count: freeOrgs },
    { count: starterOrgs },
    { count: proOrgs },
    recentResult,
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("org_members").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["confirmed", "completed"]),
    supabase.from("bookings").select("price_cents, status").in("status", ["confirmed", "completed"]),
    supabase.from("organizations").select("plan"),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("plan", "free"),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("plan", "starter"),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    supabase.from("bookings")
      .select("id, status, price_cents, time_range, created_at, org_id")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalRevenue = (revenueResult.data ?? []).reduce(
    (sum, b) => sum + (b.price_cents ?? 0), 0
  );

  const planDist = (planResult.data ?? []).reduce(
    (acc: { free: number; starter: number; pro: number; other: number }, o: { plan: string }) => {
      const p = (o.plan ?? "free") as string;
      if (p === "free") acc.free++;
      else if (p === "starter") acc.starter++;
      else if (p === "pro") acc.pro++;
      else acc.other++;
      return acc;
    },
    { free: 0, starter: 0, pro: 0, other: 0 },
  );

  return {
    orgCount: orgCount ?? 0,
    userCount: userCount ?? 0,
    bookingCount: bookingCount ?? 0,
    paidBookings: paidBookings ?? 0,
    totalRevenue,
    planDist,
    freeOrgs: freeOrgs ?? 0,
    starterOrgs: starterOrgs ?? 0,
    proOrgs: proOrgs ?? 0,
    recentBookings: recentResult.data ?? [],
  };
});

export default async function AdminOverviewPage() {
  const stats = await getStats();

  return <AdminOverview stats={stats} />;
}
