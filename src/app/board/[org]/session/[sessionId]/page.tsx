"use client";

import { use, useCallback, useEffect, useState } from "react";
import { BoardLayout, type BoardMeta } from "@/components/board/board-layout";
import { ActiveCourts, type CourtData } from "@/components/board/active-courts";
import { QueueDisplay, type QueueGroup } from "@/components/board/queue-display";
import { type SponsorItem } from "@/components/board/sponsor-marquee";

/* ── Mock data (same as main board for now) ── */

const MOCK_COURTS: CourtData[] = [
  {
    id: "c1",
    name: "Court 1", status: "active",
    teamA: [{ name: "Marco Santos", rating: "4.0" }, { name: "Jenny Lim", rating: "3.5" }],
    teamB: [{ name: "Rico Dizon", rating: "4.0" }, { name: "Anna Cruz", rating: "3.5" }],
    startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    durationMinutes: 15, gameNumber: 2,
  },
  {
    id: "c2",
    name: "Court 2", status: "active",
    teamA: [{ name: "Kyle Tan", rating: "3.0" }, { name: "Mia Reyes", rating: "3.0" }],
    teamB: [{ name: "Dave Ong", rating: "3.5" }, { name: "Sara Villanueva", rating: "3.0" }],
    startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    durationMinutes: 15, gameNumber: 1,
  },
  {
    id: "c3",
    name: "Court 3", status: "active",
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
    id: "g1", label: "Up Next", position: 1, status: "on-deck" as const,
    accent: "lime" as const, etaMinutes: 12,
    players: [
      { name: "Cathy del Rosario", rating: "3.5" }, { name: "Mark Co", rating: "3.0" },
      { name: "Luna Fernandez", rating: "3.5" }, { name: "Jared Sison", rating: "3.0" },
    ],
  },
  {
    id: "g2", label: "Group 2", position: 2, status: "waiting" as const,
    accent: "violet" as const, etaMinutes: 18,
    players: [
      { name: "Bea Tomas", rating: "4.0" }, { name: "Nico Alcantara", rating: "4.0" },
      { name: "Tina Reyes", rating: "3.5" }, { name: "Ralph Dimagiba", rating: "4.0" },
    ],
  },
  {
    id: "g3", label: "Group 3", position: 3, status: "waiting" as const,
    accent: "azure" as const, etaMinutes: 24,
    players: [
      { name: "Maya Cruz", rating: "2.5" }, { name: "Benjie Tan", rating: "3.0" },
      { name: "Paolo Lazaro", rating: "2.5" }, { name: "Diana Lopez", rating: "3.0" },
    ],
  },
];

/* ── Page ── */

export default function SharedBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; sessionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { org, sessionId } = use(params);
  const { token } = use(searchParams);
  const [valid, setValid] = useState<boolean | null>(null);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  // Validate token on mount
  const validate = useCallback(async () => {
    if (!token) {
      setValid(false);
      return;
    }
    try {
      const res = await fetch(`/api/board/share?token=${encodeURIComponent(token)}`);
      if (!res.ok) { setValid(false); return; }
      const data = await res.json();
      // Verify the session matches
      setValid(data.sessionId === sessionId && data.orgId === org);
    } catch {
      setValid(false);
    }
  }, [token, sessionId, org]);

  useEffect(() => {
    validate();
  }, [validate]);

  // Sponsors from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) {
        setSponsors(JSON.parse(saved) as SponsorItem[]);
      }
    } catch { /* ignore */ }
  }, []);

  // Invalid state
  if (valid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e] p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="mb-2 text-xl font-black text-white">
            Invalid or Expired Link
          </h1>
          <p className="text-sm text-white/40">
            This share link is invalid or has expired. Ask the front desk for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (valid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e]">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#b9f34b] border-t-transparent" />
          <span className="text-sm text-white/40">Loading board…</span>
        </div>
      </div>
    );
  }

  const orgName = org.charAt(0).toUpperCase() + org.slice(1);

  const meta: BoardMeta = {
    orgName,
    sessionName: sessionId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    view: "courts-queue",
  };

  return (
    <BoardLayout
      meta={meta}
      sponsors={sponsors}
      courtsPanel={<ActiveCourts courts={MOCK_COURTS} />}
      queuePanel={<QueueDisplay groups={MOCK_QUEUE} />}
      footer={
        <div className="flex items-center justify-between text-xs text-white/25">
          <span>Shared Board · Auto-refreshes</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#b9f34b]" />
            Connected
          </span>
        </div>
      }
    />
  );
}
