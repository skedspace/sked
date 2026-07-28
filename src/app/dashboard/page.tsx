import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { PickleballDashboardSkeleton } from "./pickleball-dashboard";
import { getSession, getMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PickleballDashboard = dynamicImport(
  () => import("./pickleball-dashboard").then((m) => m.PickleballDashboard),
  { loading: () => <PickleballDashboardSkeleton /> },
);

export const dynamic = "force-dynamic";

/** Parse a Supabase tstzrange string like "[2026-07-21 09:00:00+08,2026-07-21 10:00:00+08)" */
function parseRangePart(raw: string): Date | null {
  const trimmed = raw.trim().replace(" ", "T");
  const withOffset = /[+-]\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  const parsed = new Date(
    /[zZ]|[+-]\d{2}:\d{2}$/.test(withOffset) ? withOffset : `${withOffset}Z`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const COURT_COLORS = [
  "#69bf00",
  "#b9ea0f",
  "#ffb80e",
  "#ff684e",
  "#e9e8e2",
  "#c0c0c0",
  "#909090",
  "#606060",
];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = createClient();

  // ---- Date ranges ----
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const prevWeekStart = new Date(todayStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  const prevWeekEnd = new Date(todayStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const dateRangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${todayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ---- Parallel data fetching ----
  const [
    orgResult,
    userEmail,
    bookingsThisWeekResult,
    bookingsPrevWeekResult,
    customersCountResult,
    revenueResult,
    revenuePrevResult,
    reviewsResult,
    resourcesResult,
    weeklyBookingsResult,
    upcomingResult,
    activityResult,
    todayBookingsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.org_id)
      .maybeSingle(),

    Promise.resolve(
      session.user.user_metadata?.name ||
        session.user.email?.split("@")[0] ||
        "User",
    ),

    // 2 — Bookings this week (for stat & court counts)
    supabase
      .from("bookings")
      .select("id, resource_id, status", { count: "exact", head: false })
      .eq("org_id", membership.org_id)
      .filter("time_range", "ov", `[${weekStart.toISOString()},${todayEnd.toISOString()})`),

    // 3 — Bookings previous week (trend comparison)
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .filter("time_range", "ov", `[${prevWeekStart.toISOString()},${prevWeekEnd.toISOString()})`),

    // 4 — Total customers
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("org_id", membership.org_id),

    // 5 — Revenue this week
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("status", "succeeded")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", todayEnd.toISOString()),

    // 6 — Revenue previous week
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("status", "succeeded")
      .gte("created_at", prevWeekStart.toISOString())
      .lt("created_at", prevWeekEnd.toISOString()),

    // 7 — Reviews
    supabase
      .from("reviews")
      .select("rating")
      .eq("org_id", membership.org_id),

    // 8 — Resources (courts)
    supabase
      .from("resources")
      .select("id, name")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),

    // 9 — Weekly bookings raw (for daily chart grouping)
    supabase
      .from("bookings")
      .select("time_range, status")
      .eq("org_id", membership.org_id)
      .filter("time_range", "ov", `[${weekStart.toISOString()},${todayEnd.toISOString()})`),

    // 10 — Upcoming bookings
    supabase
      .from("bookings")
      .select(
        `id, time_range, status,
         customers ( name ), resources ( name ), services ( name )`,
      )
      .eq("org_id", membership.org_id)
      .gte("time_range", now.toISOString())
      .order("time_range", { ascending: true })
      .limit(10),

    // 11 — Recent activity (audit_log)
    supabase
      .from("audit_log")
      .select("action, payload, created_at")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(10),

    // 12 — Today's bookings (for schedule)
    supabase
      .from("bookings")
      .select(
        `id, time_range, status,
         customers ( name ), resources ( name ), services ( name )`,
      )
      .eq("org_id", membership.org_id)
      .filter("time_range", "ov", `[${todayStart.toISOString()},${todayEnd.toISOString()})`)
      .order("time_range", { ascending: true }),
  ]);

  // ---- Compute stats ----
  const orgName = orgResult?.data?.name ?? "Your Organization";

  const totalBookings = bookingsThisWeekResult.count ?? 0;
  const prevBookings = bookingsPrevWeekResult.count ?? 0;
  const bookingsTrend =
    prevBookings > 0
      ? Math.round(((totalBookings - prevBookings) / prevBookings) * 1000) / 10
      : totalBookings > 0
        ? 100
        : 0;

  const totalCustomers = customersCountResult.count ?? 0;

  const revenueCents =
    revenueResult.data?.reduce(
      (sum: number, p: { amount_cents: number }) => sum + (p.amount_cents ?? 0),
      0,
    ) ?? 0;
  const prevRevenueCents =
    revenuePrevResult.data?.reduce(
      (sum: number, p: { amount_cents: number }) => sum + (p.amount_cents ?? 0),
      0,
    ) ?? 0;
  const revenueTrend =
    prevRevenueCents > 0
      ? Math.round(((revenueCents - prevRevenueCents) / prevRevenueCents) * 1000) / 10
      : revenueCents > 0
        ? 100
        : 0;

  const reviews = (reviewsResult.data ?? []) as { rating: number }[];
  const reviewAvg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  const reviewCount = reviews.length;

  // ---- Court bookings breakdown ----
  const resources = (resourcesResult.data ?? []) as { id: string; name: string }[];
  const weeklyRows = (bookingsThisWeekResult.data ?? []) as { id: string; resource_id: string; status: string }[];
  const resourceBookingCount: Record<string, number> = {};
  for (const b of weeklyRows) {
    resourceBookingCount[b.resource_id] = (resourceBookingCount[b.resource_id] ?? 0) + 1;
  }
  const totalCourtBookings = Object.values(resourceBookingCount).reduce((s, c) => s + c, 0);
  const courtUtilization =
    resources.length > 0
      ? Math.min(100, Math.round((totalCourtBookings / (resources.length * 7)) * 100))
      : 0;

  const breakdownData = resources.map((r, i) => {
    const count = resourceBookingCount[r.id] ?? 0;
    const percent = totalCourtBookings > 0 ? Math.round((count / totalCourtBookings) * 100) : 0;
    return { name: r.name, count, percent, color: COURT_COLORS[i % COURT_COLORS.length] ?? "#69bf00" };
  });

  // ---- Chart data (daily bookings & completed) ----
  const chartDays: {
    date: string;
    dateObj: Date;
    bookings: number;
    completed: number;
  }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    chartDays.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dateObj: d,
      bookings: 0,
      completed: 0,
    });
  }

  const rawBookings = (weeklyBookingsResult.data ?? []) as {
    time_range: string;
    status: string;
  }[];
  for (const b of rawBookings) {
    const m = b.time_range.match(/\[([^,]+),/);
    if (!m) continue;
    const rangeStartText = m[1];
    if (!rangeStartText) continue;
    const bDate = parseRangePart(rangeStartText);
    if (!bDate) continue;
    const dayIndex = chartDays.findIndex(
      (d) =>
        d.dateObj.getFullYear() === bDate.getFullYear() &&
        d.dateObj.getMonth() === bDate.getMonth() &&
        d.dateObj.getDate() === bDate.getDate(),
    );
    if (dayIndex >= 0) {
      const day = chartDays[dayIndex];
      if (!day) continue;
      day.bookings++;
      if (b.status === "completed") day.completed++;
    }
  }

  const chartData = chartDays.map((d) => ({
    date: d.date,
    bookings: d.bookings,
    completed: d.completed,
  }));

  // ---- Upcoming bookings ----
  const upcomingRows = (upcomingResult.data ?? []) as any[];
  const upcomingBookings = upcomingRows.map((b: any) => {
    const m = b.time_range?.match(/\[([^,]+),([^)\]]+)/);
    if (!m) return null;
    const startText = m[1];
    const endText = m[2];
    if (!startText || !endText) return null;
    const startTime = parseRangePart(startText);
    const endTime = parseRangePart(endText);
    if (!startTime || !endTime) return null;
    const fmtTime = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return {
      date: startTime.getDate().toString().padStart(2, "0"),
      month: startTime.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      title: b.services?.name ?? "Booking",
      time: fmtTime,
      court: b.resources?.name ?? "Court",
      players: b.customers?.name ?? "Unknown",
      status: b.status === "confirmed" ? "Confirmed" : b.status === "pending" ? "Pending" : b.status.charAt(0).toUpperCase() + b.status.slice(1),
    };
  }).filter((booking): booking is NonNullable<typeof booking> => booking !== null);

  // ---- Recent activity ----
  const activityRows = (activityResult.data ?? []) as any[];
  const recentActivity = activityRows.map((a: any) => ({
    icon: a.action?.includes("payment")
      ? "payment"
      : a.action?.includes("cancel")
        ? "cancel"
        : a.action?.includes("review")
          ? "star"
          : a.action?.includes("maintenance")
            ? "wrench"
            : "default",
    title: a.action ?? "Activity",
    detail: new Date(a.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }));

  if (recentActivity.length === 0) {
    for (const b of upcomingRows.slice(0, 5)) {
      const dateMatch = b.time_range?.match(/\[([^,]+),/);
      const dateStr = dateMatch ? parseRangePart(dateMatch[1]) : null;
      recentActivity.push({
        icon: "default",
        title: `New booking by ${b.customers?.name ?? "someone"}`,
        detail: `${b.resources?.name ?? "Court"} · ${
          dateStr ? dateStr.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
        }`,
      });
    }
  }

  // ---- Today's schedule ----
  const todayRows = (todayBookingsResult.data ?? []) as any[];
  const todaySchedule = todayRows.map((b: any) => {
    const m = b.time_range?.match(/\[([^,]+),([^)\]]+)/);
    if (!m) return null;
    const startText = m[1];
    if (!startText) return null;
    const startTime = parseRangePart(startText);
    if (!startTime) return null;
    const fmtTime = startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const tone = b.status === "confirmed" ? "green" : b.status === "pending" ? "amber" : b.status === "completed" ? "blue" : "neutral";
    return {
      time: fmtTime,
      title: b.services?.name ?? "Session",
      court: b.resources?.name ?? "—",
      capacity: b.customers?.name ?? "—",
      tone,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  // ---- Notifications ----
  const notifications = activityRows.slice(0, 5).map((a: any, i: number) => ({
    id: `notif-${i}`,
    title: a.action ?? "Event",
    detail: new Date(a.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    unread: i < 2,
  }));

  // ---- Render ----
  return (
    <PickleballDashboard
      orgName={orgName}
      userDisplayName={userEmail}
      dateRangeLabel={dateRangeLabel}
      stats={{
        totalBookings,
        bookingsTrend,
        totalCustomers,
        customersTrend: 0,
        courtUtilization,
        courtUtilizationTrend: 0,
        totalRevenue: revenueCents,
        revenueTrend,
        reviewAvg,
        reviewCount,
      }}
      chartData={chartData}
      courtBreakdown={breakdownData}
      upcomingBookings={upcomingBookings}
      recentActivity={recentActivity}
      todaySchedule={todaySchedule}
      notifications={notifications}
      orgId={membership.org_id}
    />
  );
}
