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

  return (
    <CalendarView
      bookings={(bookingsResult.data ?? []) as any[]}
      resources={(resourcesResult.data ?? []) as any[]}
      services={(servicesResult.data ?? []) as any[]}
      orgId={membership.org_id}
      selectedDate={requestedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}
