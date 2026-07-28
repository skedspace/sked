"use server";

import { createClient } from "@/lib/supabase/server";

export type TournamentData = {
  id: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "round_robin" | "pool_play";
  skillLevel: string;
  startDate: string;
  endDate: string;
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  participants: number;
  maxParticipants: number;
  matchCount: number;
  completedMatches: number;
  description: string;
  entryFee: string;
  currentRound?: string;
};

export type BracketMatchData = {
  id: string;
  round: number;
  position: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: string | null;
  scoreB: string | null;
  winner: "A" | "B" | null;
};

type MatchRow = {
  id: string;
  title?: string | null;
  team_a?: string | null;
  team_b?: string | null;
  score?: string | null;
  status?: string | null;
};

/**
 * Fetch the active tournament(s) for an org (by slug, for public board pages).
 * Returns the first in-progress or upcoming tournament with its matches.
 */
export async function getTournamentForBoard(
  orgSlug: string,
): Promise<{ tournament: TournamentData | null; bracket: BracketMatchData[] }> {
  const supabase = createClient();

  // Resolve org slug to ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return { tournament: null, bracket: [] };

  // Find active or upcoming tournament
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("org_id", org.id)
    .in("status", ["in_progress", "registration"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!tournament) return { tournament: null, bracket: [] };

  // Count matches for this tournament
  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  const { count: completedMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("status", "completed");

  // Fetch matches for bracket display
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("starts_at", { ascending: true })
    .limit(50);

  // Build bracket matches — derive round/position from ordering
  const matchRows = (matches ?? []) as MatchRow[];
  const bracket: BracketMatchData[] = matchRows.map((m: MatchRow, idx: number) => {
    // Determine round from match sequence (simple heuristic for single elim)
    const total = matchRows.length || 1;
    let round = 1;
    if (total > 4) {
      if (idx < total / 4) round = 1;
      else if (idx < total / 2) round = 2;
      else if (idx < (total * 3) / 4) round = 3;
      else round = 4;
    }

    const parsedScore = m.score ?? "";
    const scoreParts = parsedScore.split(/[-–]/).map((s) => s.trim());
    const scoreA = scoreParts[0] ?? null;
    const scoreB = scoreParts[1] ?? null;

    // Determine winner from score context (team_a first, team_b second)
    let winner: "A" | "B" | null = null;
    if (m.status === "completed" && scoreA && scoreB) {
      winner = parseInt(scoreA) > parseInt(scoreB) ? "A" : "B";
    }

    return {
      id: m.id,
      round,
      position: idx,
      teamA: m.team_a || null,
      teamB: m.team_b || null,
      scoreA,
      scoreB,
      winner,
    };
  });

  const tournamentData: TournamentData = {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format,
    skillLevel: tournament.skill_level ?? "All levels",
    startDate: tournament.starts_at.split("T")[0] ?? "",
    endDate: tournament.ends_at.split("T")[0] ?? "",
    status: tournament.status,
    participants: tournament.participant_count,
    maxParticipants: tournament.max_participants,
    matchCount: matchCount ?? 0,
    completedMatches: completedMatches ?? 0,
    description: tournament.description ?? "",
    entryFee: tournament.entry_fee_cents > 0
      ? `₱${(tournament.entry_fee_cents / 100).toLocaleString()}`
      : "Free",
    currentRound: tournament.current_round ?? undefined,
  };

  return { tournament: tournamentData, bracket };
}

/**
 * Fetch tournament data for an already-resolved org ID (for dashboard).
 */
export async function getTournamentForOrgId(
  orgId: string,
): Promise<{ tournament: TournamentData | null; bracket: BracketMatchData[] }> {
  const supabase = createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("org_id", orgId)
    .in("status", ["in_progress", "registration"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!tournament) return { tournament: null, bracket: [] };

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  const { count: completedMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("status", "completed");

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("starts_at", { ascending: true })
    .limit(50);

  const matchRows = (matches ?? []) as MatchRow[];
  const bracket: BracketMatchData[] = matchRows.map((m: MatchRow, idx: number) => {
    const total = matchRows.length || 1;
    let round = 1;
    if (total > 4) {
      if (idx < total / 4) round = 1;
      else if (idx < total / 2) round = 2;
      else if (idx < (total * 3) / 4) round = 3;
      else round = 4;
    }

    const parsedScore = m.score ?? "";
    const scoreParts = parsedScore.split(/[-–]/).map((s) => s.trim());
    const scoreA = scoreParts[0] ?? null;
    const scoreB = scoreParts[1] ?? null;

    let winner: "A" | "B" | null = null;
    if (m.status === "completed" && scoreA && scoreB) {
      winner = parseInt(scoreA) > parseInt(scoreB) ? "A" : "B";
    }

    return {
      id: m.id,
      round,
      position: idx,
      teamA: m.team_a || null,
      teamB: m.team_b || null,
      scoreA,
      scoreB,
      winner,
    };
  });

  const tournamentData: TournamentData = {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format,
    skillLevel: tournament.skill_level ?? "All levels",
    startDate: tournament.starts_at.split("T")[0] ?? "",
    endDate: tournament.ends_at.split("T")[0] ?? "",
    status: tournament.status,
    participants: tournament.participant_count,
    maxParticipants: tournament.max_participants,
    matchCount: matchCount ?? 0,
    completedMatches: completedMatches ?? 0,
    description: tournament.description ?? "",
    entryFee: tournament.entry_fee_cents > 0
      ? `₱${(tournament.entry_fee_cents / 100).toLocaleString()}`
      : "Free",
    currentRound: tournament.current_round ?? undefined,
  };

  return { tournament: tournamentData, bracket };
}
