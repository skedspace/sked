import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";
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

async function loadPayments(db: any, orgId: string, start: Date, end: Date) {
  const enhanced = await db
    .from("payments")
    .select(
      `
      id, booking_id, org_id, customer_id, provider, provider_ref, type,
      category, payment_method, description, amount_cents, status, created_at,
      bookings(
        id, org_id, time_range, status, price_cents,
        customers(id, name, email),
        services(id, name, service_category),
        resources(id, name, type)
      ),
      customers(id, name, email)
    `,
    )
    .eq("org_id", orgId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (!enhanced.error) return enhanced.data ?? [];

  const fallback = await db
    .from("payments")
    .select(
      `
      id, booking_id, provider, provider_ref, type,
      amount_cents, status, created_at,
      bookings(
        id, org_id, time_range, status, price_cents,
        customers(id, name, email),
        services(id, name, service_category),
        resources(id, name, type)
      )
    `,
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  return (fallback.data ?? []).filter(
    (payment: any) => payment.bookings?.org_id === orgId,
  );
}

async function loadMatches(db: any, orgId: string, start: Date, end: Date) {
  const result = await db
    .from("matches")
    .select(
      `
      id, resource_id, service_id, title, match_type, starts_at, ends_at,
      status, score, participant_count, participant_capacity,
      resources(id, name, type),
      services(id, name)
    `,
    )
    .eq("org_id", orgId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at")
    .limit(500);

  return result.error ? [] : (result.data ?? []);
}

async function loadPlayers(db: any, orgId: string) {
  const result = await db
    .from("players")
    .select("id, name, status, skill_level, created_at")
    .eq("org_id", orgId)
    .limit(500);

  return result.error ? [] : (result.data ?? []);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = createClient();
  const db = supabase as any;
  const params = await searchParams;
  const selectedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(weekStart.getDate() - 7);

  const [
    currentBookingsResult,
    previousBookingsResult,
    resourcesResult,
    customersResult,
    currentPayments,
    previousPayments,
    currentMatches,
    previousMatches,
    players,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        id, resource_id, service_id, customer_id, time_range, status,
        price_cents, created_at,
        customers(id, name, email),
        services(id, name, service_category),
        resources(id, name, type)
      `,
      )
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${weekStart.toISOString()},${weekEnd.toISOString()})`,
      )
      .limit(500),
    supabase
      .from("bookings")
      .select(
        "id, resource_id, service_id, customer_id, time_range, status, price_cents",
      )
      .eq("org_id", membership.org_id)
      .filter(
        "time_range",
        "ov",
        `[${previousWeekStart.toISOString()},${weekStart.toISOString()})`,
      )
      .limit(500),
    supabase
      .from("resources")
      .select("id, name, type, capacity, is_active, locations(id, name)")
      .eq("org_id", membership.org_id)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name, email, created_at")
      .eq("org_id", membership.org_id)
      .limit(1000),
    loadPayments(db, membership.org_id, weekStart, weekEnd),
    loadPayments(db, membership.org_id, previousWeekStart, weekStart),
    loadMatches(db, membership.org_id, weekStart, weekEnd),
    loadMatches(db, membership.org_id, previousWeekStart, weekStart),
    loadPlayers(db, membership.org_id),
  ]);

  return (
    <ReportsView
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
      previousWeekStart={previousWeekStart.toISOString()}
      bookings={(currentBookingsResult.data ?? []) as any[]}
      previousBookings={(previousBookingsResult.data ?? []) as any[]}
      resources={(resourcesResult.data ?? []) as any[]}
      customers={(customersResult.data ?? []) as any[]}
      payments={currentPayments as any[]}
      previousPayments={previousPayments as any[]}
      matches={currentMatches as any[]}
      previousMatches={previousMatches as any[]}
      players={players as any[]}
      generatedBy={session.user.email ?? "Maya Studio"}
    />
  );
}
