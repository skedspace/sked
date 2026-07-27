"use client";

import { use, useEffect, useState } from "react";
import { MultiBoardHost } from "@/components/board/multi-board-host";
import { getLayoutById } from "@/components/board/board-layouts";
import { type CourtData } from "@/components/board/active-courts";
import { type QueueGroup } from "@/components/board/queue-display";
import { type TournamentInfo } from "@/components/board/tournament-info";
import { type BracketMatch } from "@/components/board/tournament-bracket";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import Link from "next/link";

/* ── Mock data (shared with main board) ── */

const MOCK_COURTS: CourtData[] = [
  {
    id: "c1", name: "Court 1", status: "active",
    teamA: [{ name: "Marco Santos", rating: "4.0" }, { name: "Jenny Lim", rating: "3.5" }],
    teamB: [{ name: "Rico Dizon", rating: "4.0" }, { name: "Anna Cruz", rating: "3.5" }],
    startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    durationMinutes: 15, gameNumber: 2,
  },
  {
    id: "c2", name: "Court 2", status: "active",
    teamA: [{ name: "Kyle Tan", rating: "3.0" }, { name: "Mia Reyes", rating: "3.0" }],
    teamB: [{ name: "Dave Ong", rating: "3.5" }, { name: "Sara Villanueva", rating: "3.0" }],
    startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    durationMinutes: 15, gameNumber: 1,
  },
  {
    id: "c3", name: "Court 3", status: "active",
    teamA: [{ name: "Tom Aquino", rating: "4.5" }, { name: "Paolo Guerrero", rating: "4.5" }],
    teamB: [{ name: "James Yu", rating: "4.0" }, { name: "Ben Mercado", rating: "4.5" }],
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    durationMinutes: 15, gameNumber: 3,
  },
  { id: "c4", name: "Court 4", status: "ready", durationMinutes: 15 },
  { id: "c5", name: "Court 5", status: "empty", durationMinutes: 15 },
];

const MOCK_QUEUE: QueueGroup[] = [
  {
    id: "g1", label: "Next Up", position: 1, status: "waiting" as const,
    players: [
      { name: "Cathy del Rosario", rating: "3.5" }, { name: "Mark Co", rating: "3.0" },
      { name: "Luna Fernandez", rating: "3.5" }, { name: "Jared Sison", rating: "3.0" },
    ],
  },
  {
    id: "g2", label: "Group 2", position: 2, status: "waiting" as const,
    players: [
      { name: "Bea Tomas", rating: "4.0" }, { name: "Nico Alcantara", rating: "4.0" },
      { name: "Tina Reyes", rating: "3.5" }, { name: "Ralph Dimagiba", rating: "4.0" },
    ],
  },
  {
    id: "g3", label: "Group 3", position: 3, status: "waiting" as const,
    players: [
      { name: "Maya Cruz", rating: "2.5" }, { name: "Benjie Tan", rating: "3.0" },
      { name: "Paolo Lazaro", rating: "2.5" }, { name: "Diana Lopez", rating: "3.0" },
    ],
  },
];

const MOCK_TOURNAMENT: TournamentInfo = {
  id: "t1", name: "Club Championships", format: "single_elimination",
  skillLevel: "All levels", startDate: "2026-07-25", endDate: "2026-07-27",
  status: "in_progress", participants: 48, maxParticipants: 48,
  matchCount: 40, completedMatches: 28,
  description: "Annual club championship. Pool play + bracket. 8 courts in simultaneous use.",
  entryFee: "Members only", currentRound: "Quarterfinals",
};

const MOCK_BRACKET: BracketMatch[] = [
  { id: "qf1", round: 3, position: 0, teamA: "Marco / Jenny", teamB: "Rico / Anna", scoreA: "11-7", scoreB: "13-15", winner: "A" },
  { id: "qf2", round: 3, position: 1, teamA: "Tom / Paolo", teamB: "Kyle / Mia", scoreA: "11-3", scoreB: "11-9", winner: "A" },
  { id: "qf3", round: 3, position: 2, teamA: "James / Ben", teamB: "Cathy / Mark", scoreA: "15-13", scoreB: "8-11", winner: "B" },
  { id: "qf4", round: 3, position: 3, teamA: "Bea / Nico", teamB: "Maya / Benjie", scoreA: "11-5", scoreB: "11-4", winner: "A" },
  { id: "sf1", round: 4, position: 0, teamA: "Marco / Jenny", teamB: "Tom / Paolo", scoreA: null, scoreB: null, winner: null },
  { id: "sf2", round: 4, position: 1, teamA: "Cathy / Mark", teamB: "Bea / Nico", scoreA: null, scoreB: null, winner: null },
];

/* ── Page ── */

export default function MultiBoardPage({
  params,
}: {
  params: Promise<{ org: string; layoutId: string }>;
}) {
  const { org, layoutId } = use(params);

  const orgName = org.charAt(0).toUpperCase() + org.slice(1);
  const layout = getLayoutById(layoutId);

  // Sponsors from localStorage
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) {
        setSponsors(JSON.parse(saved) as SponsorItem[]);
      }
    } catch { /* ignore */ }
  }, []);

  // Layout not found → show error
  if (!layout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e] p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-2xl">🔲</span>
          </div>
          <h1 className="mb-2 text-xl font-black text-white">
            Layout Not Found
          </h1>
          <p className="mb-6 text-sm text-white/40">
            No layout named &ldquo;{layoutId}&rdquo;. Choose a preset:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["courts-queue", "triple", "full-courts", "full-bracket", "quad"].map(
              (id) => (
                <Link
                  key={id}
                  href={`/board/${org}/multi/${id}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
                >
                  {id.replace(/-/g, " + ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MultiBoardHost
      layout={layout}
      courts={MOCK_COURTS}
      queue={MOCK_QUEUE}
      tournament={MOCK_TOURNAMENT}
      bracket={MOCK_BRACKET}
      orgName={orgName}
      sessionName="Morning Open Play"
      sponsors={sponsors}
    />
  );
}
