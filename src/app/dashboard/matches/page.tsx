import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MatchesView } from "./matches-view";
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

export default async function MatchesPage({
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

  const [matchesResult, resourcesResult, servicesResult] = await Promise.all([
    db
      .from("matches")
      .select(
        `
        id, title, team_a, team_b, match_type, starts_at, ends_at, status,
        score, participant_count, participant_capacity, notes, created_at,
        resources(id, name, type),
        services(id, name)
      `,
      )
      .eq("org_id", membership.org_id)
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at"),
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
    <MatchesView
      orgId={membership.org_id}
      matches={(matchesResult.data ?? []) as any[]}
      resources={(resourcesResult.data ?? []) as any[]}
      services={(servicesResult.data ?? []) as any[]}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}
