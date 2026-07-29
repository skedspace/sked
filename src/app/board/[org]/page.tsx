"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  BoardLayout,
  type BoardMeta,
  type BoardView,
} from "@/components/board/board-layout";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  ActiveCourts,
  type CourtData,
  type CourtPlayer,
} from "@/components/board/active-courts";
import { CourtStatsStrip } from "@/components/board/court-stats-strip";
import {
  QueueDisplay,
  type QueueGroup,
} from "@/components/board/queue-display";
import {
  TournamentInfoPanel,
  type TournamentInfo,
} from "@/components/board/tournament-info";
import {
  TournamentBracket,
  type BracketMatch,
} from "@/components/board/tournament-bracket";
import { ShareBoard } from "@/components/board/share-board";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import { createClient } from "@/lib/supabase/client";
import type { LiveSession, LiveSessionState } from "@/lib/session-actions";
import { getTournamentForBoard } from "@/lib/tournament-actions";
import type {
  BracketMatchData,
  TournamentData,
} from "@/lib/tournament-actions";
import {
  formatCachedAt,
  loadCachedBoardState,
  saveCachedBoardState,
} from "@/lib/board-offline-cache";

const DEFAULT_SPONSORS: SponsorItem[] = [
  { id: "s1", type: "text", content: "SportsTech Pro", label: "Official Sponsor:" },
  { id: "s2", type: "text", content: "Dumala", label: "Presented by:" },
  { id: "s3", type: "text", content: "Pickleball Paradise", label: "Presented by:" },
];

type OrgRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

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
      base.teamA = [c.group.players[0], c.group.players[1]] as [
        CourtPlayer,
        CourtPlayer,
      ];
      base.teamB = [c.group.players[2], c.group.players[3]] as [
        CourtPlayer,
        CourtPlayer,
      ];
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

function titleizeSlug(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function BoardPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = use(params);
  const fallbackOrgName = titleizeSlug(org);

  const [view, setView] = useState<BoardView>("courts-queue");
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState("Open Play");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState(fallbackOrgName);
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [queue, setQueue] = useState<QueueGroup[]>([]);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [bracket, setBracket] = useState<BracketMatchData[]>([]);
  const [boardTitle, setBoardTitle] = useState<string | undefined>(undefined);
  const [tagline, setTagline] = useState<string | undefined>(undefined);
  const [sponsors, setSponsors] = useState<SponsorItem[]>(DEFAULT_SPONSORS);

  useEffect(() => {
    const cached = loadCachedBoardState(org);
    if (cached) {
      setOrgName(cached.orgName);
      setSessionName(cached.sessionName);
      setCourts(cached.courts);
      setQueue(cached.queue);
      setTournament(cached.tournament);
      setBracket(cached.bracket);
      setSponsors(cached.sponsors.length > 0 ? cached.sponsors : DEFAULT_SPONSORS);
      setBoardTitle(cached.boardTitle);
      setTagline(cached.tagline);
      setCachedAt(cached.savedAt);
    }

    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) {
        const parsed = JSON.parse(saved) as SponsorItem[];
        if (parsed.length > 0) setSponsors(parsed);
      }
    } catch {
      // Ignore local sponsor cache issues on TV displays.
    }
  }, [org]);

  const fetchSession = useCallback(async () => {
    try {
      const db = createClient();
      let orgRow = (
        await db
          .from("organizations")
          .select("id, name, slug")
          .eq("slug", org)
          .maybeSingle()
      ).data as OrgRow | null;

      if (!orgRow) {
        orgRow = (
          await db
            .from("organizations")
            .select("id, name, slug")
            .eq("id", org)
            .maybeSingle()
        ).data as OrgRow | null;
      }

      if (!orgRow) {
        const cached = loadCachedBoardState(org);
        if (cached) {
          setOffline(true);
          setCachedAt(cached.savedAt);
        }
        setLoading(false);
        return;
      }

      const [settingsResult, sessionResult, tournamentResult] =
        await Promise.all([
          db
            .from("org_settings")
            .select("board_title, board_tagline")
            .eq("org_id", orgRow.id)
            .maybeSingle(),
          db
            .from("live_sessions")
            .select("*")
            .eq("org_id", orgRow.id)
            .eq("status", "active")
            .maybeSingle(),
          getTournamentForBoard(orgRow.slug ?? org),
        ]);

      const settings = settingsResult.data as
        | { board_title?: string | null; board_tagline?: string | null }
        | null;
      const session = sessionResult.data as LiveSession | null;
      const nextOrgName = orgRow.name ?? fallbackOrgName;
      const nextBoardTitle = settings?.board_title ?? undefined;
      const nextTagline = settings?.board_tagline ?? undefined;
      let nextSessionId: string | null = null;
      let nextSessionName = "No Active Session";
      let nextCourts: CourtData[] = [];
      let nextQueue: QueueGroup[] = [];

      if (session) {
        const state = session.state as LiveSessionState;
        nextSessionId = session.id;
        nextSessionName = session.name;
        nextCourts = sessionCourtsToCourtData(state.courts ?? []);
        nextQueue = sessionToQueueGroups(state);
      }

      const nextTournament = tournamentResult.tournament as TournamentData | null;
      const nextBracket = tournamentResult.bracket as BracketMatchData[];

      setResolvedOrgId(orgRow.id);
      setOrgName(nextOrgName);
      setSessionId(nextSessionId);
      setSessionName(nextSessionName);
      setCourts(nextCourts);
      setQueue(nextQueue);
      setTournament(nextTournament);
      setBracket(nextBracket);
      setBoardTitle(nextBoardTitle);
      setTagline(nextTagline);
      setOffline(false);
      setCachedAt(null);
      setLoading(false);

      saveCachedBoardState(org, {
        orgName: nextOrgName,
        sessionName: nextSessionName,
        courts: nextCourts,
        queue: nextQueue,
        tournament: nextTournament,
        bracket: nextBracket,
        sponsors,
        boardTitle: nextBoardTitle,
        tagline: nextTagline,
      });
    } catch {
      const cached = loadCachedBoardState(org);
      if (cached) {
        setOrgName(cached.orgName);
        setSessionName(cached.sessionName);
        setCourts(cached.courts);
        setQueue(cached.queue);
        setTournament(cached.tournament);
        setBracket(cached.bracket);
        setSponsors(cached.sponsors.length > 0 ? cached.sponsors : DEFAULT_SPONSORS);
        setBoardTitle(cached.boardTitle);
        setTagline(cached.tagline);
        setCachedAt(cached.savedAt);
      }
      setOffline(true);
      setLoading(false);
    }
  }, [fallbackOrgName, org, sponsors]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 10_000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const waitingPlayers = queue.reduce((sum, group) => sum + group.players.length, 0);
  const activeGames = courts.filter((court) => court.status === "active").length;
  const playersOnCourt = activeGames * 4;
  const cachedTime = formatCachedAt(cachedAt);

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
            <p className="text-sm text-white/20">Loading courts...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ActiveCourts
              courts={courts}
              showStats={false}
              stats={{
                playersCheckedIn: playersOnCourt + waitingPlayers,
                activeGames,
                courtsAvailable: courts.length,
                avgWaitMinutes: queue.length > 0 ? queue[0]?.etaMinutes ?? 0 : 0,
              }}
            />
            <CourtStatsStrip
              stats={{
                playersCheckedIn: playersOnCourt + waitingPlayers,
                activeGames,
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
            <p className="text-sm text-white/20">Loading queue...</p>
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
                skillLevel: "-",
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
          <span className="hidden text-xs text-white/25 sm:inline">
            {offline
              ? `Offline${cachedTime ? ` - Last updated ${cachedTime}` : ""}`
              : sessionId
                ? "Auto-refreshes every 10s - Live"
                : "No active session"}
          </span>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {(
              [
                "courts-queue",
                "courts-tournament",
                "triple",
                "full-courts",
                "full-bracket",
              ] as BoardView[]
            ).map((nextView) => (
              <button
                key={nextView}
                type="button"
                onClick={() => setView(nextView)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  view === nextView
                    ? "bg-[#b9f34b]/20 text-[#b9f34b]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {nextView === "courts-queue"
                  ? "Courts+Queue"
                  : nextView === "courts-tournament"
                    ? "Courts+Tournament"
                    : nextView === "triple"
                      ? "Triple"
                      : nextView === "full-courts"
                        ? "Full Courts"
                        : "Bracket"}
              </button>
            ))}
          </div>

          {sessionId && (
            <ShareBoard
              orgId={resolvedOrgId ?? org}
              orgSlug={org}
              sessionId={sessionId}
            />
          )}
        </div>
      }
    />
  );
}
