"use client";

import { use, useEffect, useState } from "react";
import { BoardLayout, type BoardMeta, type BoardView } from "@/components/board/board-layout";
import { ActiveCourts, type CourtData } from "@/components/board/active-courts";
import { QueueDisplay, type QueueGroup } from "@/components/board/queue-display";
import { TournamentInfoPanel, type TournamentInfo } from "@/components/board/tournament-info";
import { TournamentBracket, type BracketMatch } from "@/components/board/tournament-bracket";
import { ShareBoard } from "@/components/board/share-board";
import { type SponsorItem } from "@/components/board/sponsor-marquee";

/* ── Mock Data ── */

const MOCK_COURTS: CourtData[] = [
  {
    id: "c1",
    name: "Court 1",
    status: "active",
    accent: "lime",
    teamA: [
      { name: "Marco Santos", rating: "4.0" },
      { name: "Jenny Lim", rating: "3.5" },
    ],
    teamB: [
      { name: "Rico Dizon", rating: "4.0" },
      { name: "Anna Cruz", rating: "3.5" },
    ],
    startedAt: new Date(Date.now() - (10 * 60 + 8) * 1000).toISOString(),
    durationMinutes: 15,
    gameNumber: 2,
  },
  {
    id: "c2",
    name: "Court 2",
    status: "active",
    accent: "azure",
    teamA: [
      { name: "Kyle Tan", rating: "3.0" },
      { name: "Mia Reyes", rating: "3.0" },
    ],
    teamB: [
      { name: "Dave Ong", rating: "3.5" },
      { name: "Sara Villanueva", rating: "3.0" },
    ],
    startedAt: new Date(Date.now() - (6 * 60 + 8) * 1000).toISOString(),
    durationMinutes: 15,
    gameNumber: 1,
  },
  {
    id: "c3",
    name: "Court 3",
    status: "active",
    accent: "violet",
    teamA: [
      { name: "Tom Aquino", rating: "4.5" },
      { name: "Paolo Guerrero", rating: "4.5" },
    ],
    teamB: [
      { name: "James Yu", rating: "4.0" },
      { name: "Ben Mercado", rating: "4.5" },
    ],
    startedAt: new Date(Date.now() - (14 * 60 + 8) * 1000).toISOString(),
    durationMinutes: 15,
    gameNumber: 3,
  },
  {
    id: "c4",
    name: "Court 4",
    status: "ready",
    durationMinutes: 15,
  },
  {
    id: "c5",
    name: "Court 5",
    status: "empty",
    durationMinutes: 15,
  },
];

const MOCK_QUEUE: QueueGroup[] = [
  {
    id: "g1",
    label: "Up Next",
    players: [
      { name: "Cathy del Rosario", rating: "3.5" },
      { name: "Mark Co", rating: "3.0" },
      { name: "Luna Fernandez", rating: "3.5" },
      { name: "Jared Sison", rating: "3.0" },
    ],
    status: "on-deck",
    position: 1,
    accent: "lime",
    etaMinutes: 12,
  },
  {
    id: "g2",
    label: "Group 2",
    players: [
      { name: "Bea Tomas", rating: "4.0" },
      { name: "Nico Alcantara", rating: "4.0" },
      { name: "Tina Reyes", rating: "3.5" },
      { name: "Ralph Dimagiba", rating: "4.0" },
    ],
    status: "waiting",
    position: 2,
    accent: "violet",
    etaMinutes: 18,
  },
  {
    id: "g3",
    label: "Group 3",
    players: [
      { name: "Maya Cruz", rating: "2.5" },
      { name: "Benjie Tan", rating: "3.0" },
      { name: "Paolo Lazaro", rating: "2.5" },
      { name: "Diana Lopez", rating: "3.0" },
    ],
    status: "waiting",
    position: 3,
    accent: "azure",
    etaMinutes: 24,
  },
  {
    id: "g4",
    label: "Returned",
    players: [
      { name: "Rico Dizon", rating: "4.0" },
      { name: "Anna Cruz", rating: "3.5" },
    ],
    status: "returned",
    position: 4,
    accent: "amber",
    returnedAgoMinutes: 30,
  },
];

const MOCK_TOURNAMENT: TournamentInfo = {
  id: "t1",
  name: "Club Championships",
  format: "single_elimination",
  skillLevel: "All levels",
  startDate: "2026-07-25",
  endDate: "2026-07-27",
  status: "in_progress",
  participants: 48,
  maxParticipants: 48,
  matchCount: 40,
  completedMatches: 28,
  description: "Annual club championship. Pool play + bracket. 8 courts in simultaneous use.",
  entryFee: "Members only",
  currentRound: "Quarterfinals",
};

const MOCK_BRACKET: BracketMatch[] = [
  // Quarterfinals (round 3 of 4)
  { id: "qf1", round: 3, position: 0, teamA: "Marco / Jenny", teamB: "Rico / Anna", scoreA: "11-7", scoreB: "13-15", winner: "A" },
  { id: "qf2", round: 3, position: 1, teamA: "Tom / Paolo", teamB: "Kyle / Mia", scoreA: "11-3", scoreB: "11-9", winner: "A" },
  { id: "qf3", round: 3, position: 2, teamA: "James / Ben", teamB: "Cathy / Mark", scoreA: "15-13", scoreB: "8-11", winner: "B" },
  { id: "qf4", round: 3, position: 3, teamA: "Bea / Nico", teamB: "Maya / Benjie", scoreA: "11-5", scoreB: "11-4", winner: "A" },
  // Semifinals (round 4 of 4)
  { id: "sf1", round: 4, position: 0, teamA: "Marco / Jenny", teamB: "Tom / Paolo", scoreA: null, scoreB: null, winner: null },
  { id: "sf2", round: 4, position: 1, teamA: "Cathy / Mark", teamB: "Bea / Nico", scoreA: null, scoreB: null, winner: null },
];

/** Shown until an operator configures sponsors from the dashboard. */
const DEFAULT_SPONSORS: SponsorItem[] = [
  { id: "s1", type: "text", content: "SportsTech Pro", label: "Official Sponsor:", icon: "🏆" },
  { id: "s2", type: "text", content: "Dumala", label: "Presented by:", icon: "🎒" },
  { id: "s3", type: "text", content: "Pickleball Paradise", label: "Presented by:", icon: "🥒" },
];

/* ── Session ID (mocked) ── */

const SESSION_ID = "session-001";

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

  const waitingPlayers = MOCK_QUEUE.reduce((sum, g) => sum + g.players.length, 0);
  const playersOnCourt = MOCK_COURTS.filter((c) => c.status === "active").length * 4;

  const meta: BoardMeta = {
    orgName,
    sessionName: "Morning Open Play",
    view,
    tournamentName: MOCK_TOURNAMENT.name,
    alerts: 1,
  };

  return (
    <BoardLayout
      meta={meta}
      sponsors={sponsors}
      courtsPanel={
        <ActiveCourts
          courts={MOCK_COURTS}
          stats={{
            playersCheckedIn: playersOnCourt + waitingPlayers,
            avgWaitMinutes: 12,
          }}
        />
      }
      queuePanel={<QueueDisplay groups={MOCK_QUEUE} />}
      tournamentPanel={
        view === "courts-tournament" || view === "triple" ? (
          <TournamentInfoPanel tournament={MOCK_TOURNAMENT} />
        ) : (
          <TournamentBracket matches={MOCK_BRACKET} />
        )
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* Left: status */}
          <span className="hidden text-xs text-white/25 sm:inline">
            Auto-refreshes every 10s
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
          <ShareBoard orgId={org} sessionId={SESSION_ID} />
        </div>
      }
    />
  );
}
