"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { BoardLayout, type BoardMeta, type BoardView } from "@/components/board/board-layout";
import { BorderBeam } from "@/components/ui/border-beam";
import { ActiveCourts, type CourtData, type CourtPlayer } from "@/components/board/active-courts";
import { CourtStatsStrip } from "@/components/board/court-stats-strip";
import { QueueDisplay, type QueueGroup, type QueuePlayer } from "@/components/board/queue-display";
import { TournamentInfoPanel, type TournamentInfo } from "@/components/board/tournament-info";
import { TournamentBracket, type BracketMatch } from "@/components/board/tournament-bracket";
import { ShareBoard } from "@/components/board/share-board";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import { createClient } from "@/lib/supabase/client";
import type { LiveSessionState, LiveSession } from "@/lib/session-actions";
import { getTournamentForBoard } from "@/lib/tournament-actions";
import type { TournamentData, BracketMatchData } from "@/lib/tournament-actions";

/** Shown until an operator configures sponsors from the dashboard. */
const DEFAULT_SPONSORS: SponsorItem[] = [
  { id: "s1", type: "text", content: "SportsTech Pro", label: "Official Sponsor:", icon: "🏆" },
  { id: "s2", type: "text", content: "Dumala", label: "Presented by:", icon: "🎒" },
  { id: "s3", type: "text", content: "Pickleball Paradise", label: "Presented by:", icon: "🥒" },
];

/* ── Helpers to transform session state ── */

function sessionCourtsToCourtData(courts: LiveSessionState["courts"]): CourtData[] {
  return courts.map((c) => {
    const base: CourtData = {
      id: c.courtId,
      name: c.courtName,
      status: c.status,
      durationMinutes: c.durationMinutes,
      gameNumber: undefined,
    };

    if (c.status === "active" && c.group && c.group.players.length >= 4) {
      base.teamA = [c.group.players[0], c.group.players[1]] as [CourtPlayer, CourtPlayer];
      base.teamB = [c.group.players[2], c.group.players[3]] as [CourtPlayer, CourtPlayer];
      base.startedAt = c.startedAt ?? undefined;
      base.gameNumber = 1;
    } else if (c.status === "ready" && c.group) {
      base.status = "ready";
    }

    return base;
  });
}

function sessionToQueueGroups(state: LiveSessionState): QueueGroup[] {
  const groups: QueueGroup[] = [];

  // Groups that are waiting → they're in state.groups
  state.groups.forEach((g, idx) => {
    groups.push({
      id: g.id,
      label: g.label,
      players: g.players.map((p) => ({ name: p.name, rating: p.rating })),
      status: idx === 0 ? "on-deck" : "waiting",
      position: idx + 1,
      accent: (["lime", "violet", "azure", "amber"] as const)[idx % 4],
      etaMinutes: (idx + 1) * 6,
    });
  });

  // Returned players as a group
  if (state.returned.length > 0) {
    groups.push({
      id: "returned",
      label: "Returned",
      players: state.returned.map((p) => ({ name: p.name, rating: p.rating })),
      status: "returned",
      position: groups.length + 1,
      accent: "amber",
      returnedAgoMinutes: 0,
    });
  }

  return groups;
}

/* ── Page ── */

export default function BoardPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = use(params);

  const orgName = org.charAt(0).toUpperCase() + org.slice(1);

  // View toggle
  const [view, setView] = useState<BoardView>("courts-queue");
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState("Open Play");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Real session state from the live_sessions table
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [queue, setQueue] = useState<QueueGroup[]>([]);

  // Real tournament data
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [bracket, setBracket] = useState<BracketMatchData[]>([]);

  // Board header settings from org_settings (title & tagline)
  const [boardTitle, setBoardTitle] = useState<string | undefined>(undefined);
  const [tagline, setTagline] = useState<string | undefined>(undefined);

  // Sponsors from localStorage (set via SessionControl dashboard)
  const [sponsors, setSponsors] = useState<SponsorItem[]>(DEFAULT_SPONSORS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) {
        const parsed = JSON.parse(saved) as SponsorItem[];
        if (parsed.length > 0) setSponsors(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch board header settings (one-time at mount) ──
  useEffect(() => {
    (async () => {
      const db = createClient();
      const { data: orgRow } = await db
        .from("organizations")
        .select("id")
        .eq("slug", org)
        .single();

      if (!orgRow) return;

      const { data: settings } = await db
        .from("org_settings")
        .select("board_title, board_tagline")
        .eq("org_id", orgRow.id)
        .maybeSingle();

      if (settings) {
        setBoardTitle(settings.board_title ?? undefined);
        setTagline(settings.board_tagline ?? undefined);
      }
    })();
  }, [org]);

  // ── Fetch session state from DB ──
  const fetchSession = useCallback(async () => {
    const db = createClient();
    // Resolve org slug → org id → find active session
    const { data: orgRow } = await db
      .from("organizations")
      .select("id")
      .eq("slug", org)
      .single();

    if (!orgRow) {
      setLoading(false);
      return;
    }

    const [sessionResult, tournamentResult] = await Promise.all([
      db
        .from("live_sessions")
        .select("*")
        .eq("org_id", orgRow.id)
        .eq("status", "active")
        .maybeSingle(),
      getTournamentForBoard(org),
    ]);

    const session = sessionResult.data;

    if (session) {
      const s = session as LiveSession;
      const state = s.state as LiveSessionState;
      setSessionId(s.id);
      setSessionName(s.name);
      setCourts(sessionCourtsToCourtData(state.courts ?? []));
      setQueue(sessionToQueueGroups(state));
    } else {
      setCourts([]);
      setQueue([]);
      setSessionName("No Active Session");
    }

    setTournament(tournamentResult.tournament as TournamentData | null);
    setBracket(tournamentResult.bracket as BracketMatchData[]);
    setLoading(false);
  }, [org]);

  // Initial fetch + poll every 10 seconds
  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 10_000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  // Compute stats from live data
  const waitingPlayers = queue.reduce((sum, g) => sum + g.players.length, 0);
  const playersOnCourt = courts.filter((c) => c.status === "active").length * 4;

  const meta: BoardMeta = {
    orgName,
    sessionName,
    view,
    tournamentName: tournament?.name,
    boardTitle,
    tagline,
    alerts: 0,
  };

  return (
    <BoardLayout
      meta={meta}
      sponsors={sponsors}
      courtsPanel={
        loading ? (
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#151713] py-16">
            <BorderBeam
              size={100}
              duration={12}
              colorFrom="#b9f34b"
              colorTo="#5b8def"
              borderWidth={1}
            />
            <p className="text-sm text-white/20">Loading courts…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ActiveCourts
              courts={courts}
              showStats={false}
              stats={{
                playersCheckedIn: playersOnCourt + waitingPlayers,
                activeGames: courts.filter((c) => c.status === "active").length,
                courtsAvailable: courts.length,
                avgWaitMinutes: queue.length > 0 ? queue[0]?.etaMinutes ?? 0 : 0,
              }}
            />
            <CourtStatsStrip
              stats={{
                playersCheckedIn: playersOnCourt + waitingPlayers,
                activeGames: courts.filter((c) => c.status === "active").length,
                courtsAvailable: courts.length,
                avgWaitMinutes: queue.length > 0 ? queue[0]?.etaMinutes ?? 0 : 0,
              }}
            />
          </div>
        )
      }
      queuePanel={
        loading ? (
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#151713] py-16">
            <BorderBeam
              size={100}
              duration={12}
              colorFrom="#b9f34b"
              colorTo="#5b8def"
              borderWidth={1}
            />
            <p className="text-sm text-white/20">Loading queue…</p>
          </div>
        ) : (
          <QueueDisplay groups={queue} />
        )
      }
      tournamentPanel={
        view === "courts-tournament" || view === "triple" ? (
          tournament ? (
            <TournamentInfoPanel tournament={tournament as TournamentInfo} />
          ) : (
            <TournamentInfoPanel
              tournament={{
                id: "",
                name: "No active tournament",
                format: "single_elimination",
                skillLevel: "—",
                startDate: "",
                endDate: "",
                status: "draft",
                participants: 0,
                maxParticipants: 0,
                matchCount: 0,
                completedMatches: 0,
                description: "",
                entryFee: "",
                currentRound: "",
              }}
            />
          )
        ) : bracket.length > 0 ? (
          <TournamentBracket matches={bracket as BracketMatch[]} />
        ) : (
          <TournamentBracket matches={[]} />
        )
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* Left: status */}
          <span className="hidden text-xs text-white/25 sm:inline">
            {sessionId ? "Auto-refreshes every 10s · Live" : "No active session"}
          </span>

          {/* Center: view switcher */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {(["courts-queue", "courts-tournament", "triple", "full-courts", "full-bracket"] as BoardView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  view === v
                    ? "bg-[#b9f34b]/20 text-[#b9f34b]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {v === "courts-queue"
                  ? "Courts+Queue"
                  : v === "courts-tournament"
                    ? "Courts+Tournament"
                    : v === "triple"
                      ? "Triple"
                      : v === "full-courts"
                        ? "Full Courts"
                        : "Bracket"}
              </button>
            ))}
          </div>

          {/* Right: share board */}
          {sessionId && <ShareBoard orgId={org} sessionId={sessionId} />}
        </div>
      }
    />
  );
}
