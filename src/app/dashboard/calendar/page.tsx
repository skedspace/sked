import { getMockBookings } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarView } from "./calendar-view";
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

export default async function CalendarPage({
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
  const requestedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(requestedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [bookingsResult, resourcesResult, servicesResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        id, time_range, status, price_cents, source, created_at,
        customers(name, email, phone),
        services(id, name, duration_min, price_cents),
        resources(id, name)
      `,
      )
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${weekStart.toISOString()},${weekEnd.toISOString()})`,
      )
      .order("time_range"),
    supabase
      .from("resources")
      .select("id, name, type, capacity")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const hasConfiguredCourts = (resourcesResult.data?.length ?? 0) > 0;
  const isSampleData =
    !hasConfiguredCourts && (bookingsResult.data?.length ?? 0) === 0;

  const displayBookings = isSampleData
    ? getMockBookings()
    : (bookingsResult.data ?? []);
  const displayResources = hasConfiguredCourts
    ? (resourcesResult.data ?? [])
    : [
        { id: "court-1", name: "Court 1", type: "court", capacity: 4 },
        { id: "court-2", name: "Court 2", type: "court", capacity: 4 },
        { id: "court-3", name: "Court 3", type: "court", capacity: 8 },
        { id: "court-4", name: "Court 4", type: "court", capacity: 6 },
      ];
  const displayServices =
    (servicesResult.data?.length ?? 0) > 0
      ? (servicesResult.data ?? [])
      : isSampleData
        ? [
            {
              id: "svc-rental",
              name: "Court Rental",
              duration_min: 60,
              price_cents: 150000,
            },
            {
              id: "svc-coaching",
              name: "Private Coaching",
              duration_min: 60,
              price_cents: 200000,
            },
            {
              id: "svc-social",
              name: "Social Play",
              duration_min: 90,
              price_cents: 80000,
            },
            {
              id: "svc-open",
              name: "Open Play",
              duration_min: 120,
              price_cents: 100000,
            },
            {
              id: "svc-tournament",
              name: "Tournament Match",
              duration_min: 120,
              price_cents: 250000,
            },
          ]
        : [];

  return (
    <CalendarView
      bookings={displayBookings}
      resources={displayResources}
      services={displayServices}
      orgId={membership.org_id}
      selectedDate={requestedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
      isSampleData={isSampleData}
    />
  );
}
