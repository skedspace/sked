import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookingsList } from "./bookings-list";
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

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const params = await searchParams;
  const selectedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const supabase = createClient();
  const [bookingsResult, resourcesResult, servicesResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        id, time_range, status, price_cents, source, created_at,
        customers(name, email, phone),
        services(id, name, duration_min, price_cents),
        resources(id, name, type),
        payments(id, provider, provider_ref, type, amount_cents, status, created_at)
      `,
        { count: "exact" },
      )
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${weekStart.toISOString()},${weekEnd.toISOString()})`,
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("resources")
      .select("id, name, type, capacity, is_active")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents, is_active")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <BookingsList
      orgId={membership.org_id}
      bookings={(bookingsResult.data ?? []) as any[]}
      totalCount={bookingsResult.count ?? bookingsResult.data?.length ?? 0}
      resources={(resourcesResult.data ?? []) as any[]}
      services={(servicesResult.data ?? []) as any[]}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}
