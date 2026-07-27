import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayersView } from "./players-view";
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

export default async function PlayersPage({
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

  const [playersResult, statsResult] = await Promise.all([
    db
      .from("players")
      .select(
        "id, name, email, phone, skill_level, play_style, status, birthday, notes, created_at",
      )
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("match_players")
      .select("id, player_id, result, matches(id, starts_at, status)")
      .eq("org_id", membership.org_id),
  ]);

  return (
    <PlayersView
      orgId={membership.org_id}
      players={(playersResult.data ?? []) as any[]}
      matchStats={(statsResult.data ?? []) as any[]}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}
