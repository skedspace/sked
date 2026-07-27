import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CourtsView } from "./courts-view";
import { getSession, getMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRequestedDate(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date();

  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function CourtsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = createClient();
  const params = await searchParams;
  const selectedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const todayStart = new Date(selectedDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayStart.getDate() + 1);

  const [
    resourcesResult,
    locationsResult,
    servicesResult,
    serviceLinksResult,
    weekBookingsResult,
    todayBookingsResult,
    operatingHoursResult,
  ] = await Promise.all([
    supabase
      .from("resources")
      .select(
        "id, name, type, capacity, is_active, location_id, locations(id, name, address)",
      )
      .eq("org_id", membership.org_id)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, address, is_active")
      .eq("org_id", membership.org_id)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents, is_active")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),
    supabase.from("service_resources").select("service_id, resource_id"),
    supabase
      .from("bookings")
      .select("id, resource_id, time_range, status")
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${weekStart.toISOString()},${weekEnd.toISOString()})`,
      ),
    supabase
      .from("bookings")
      .select("id, resource_id, time_range, status")
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${todayStart.toISOString()},${todayEnd.toISOString()})`,
      ),
    supabase
      .from("operating_hours")
      .select("location_id, weekday, opens_at, closes_at, is_active"),
  ]);

  return (
    <CourtsView
      orgId={membership.org_id}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
      resources={(resourcesResult.data ?? []) as any[]}
      locations={(locationsResult.data ?? []) as any[]}
      services={(servicesResult.data ?? []) as any[]}
      serviceLinks={(serviceLinksResult.data ?? []) as any[]}
      weekBookings={(weekBookingsResult.data ?? []) as any[]}
      todayBookings={(todayBookingsResult.data ?? []) as any[]}
      operatingHours={(operatingHoursResult.data ?? []) as any[]}
    />
  );
}
