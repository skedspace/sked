"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { MultiBoardHost } from "@/components/board/multi-board-host";
import { getLayoutById } from "@/components/board/board-layouts";
import { type CourtData, type CourtPlayer } from "@/components/board/active-courts";
import { type QueueGroup } from "@/components/board/queue-display";
import { type TournamentInfo } from "@/components/board/tournament-info";
import { type BracketMatch } from "@/components/board/tournament-bracket";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import { createClient } from "@/lib/supabase/client";
import type { LiveSessionState, LiveSession } from "@/lib/session-actions";
import Link from "next/link";

/* ── Helpers to transform session state ── */

function sessionCourtsToCourtData(courts: LiveSessionState["courts"]): CourtData[] {
  return courts.map((c) => {
    const base: CourtData = {
      id: c.courtId,
      name: c.courtName,
      status: c.status,
      durationMinutes: c.durationMinutes,
    };
    if (c.status === "active" && c.group && c.group.players.length >= 4) {
      base.teamA = [c.group.players[0], c.group.players[1]] as [CourtPlayer, CourtPlayer];
      base.teamB = [c.group.players[2], c.group.players[3]] as [CourtPlayer, CourtPlayer];
      base.startedAt = c.startedAt ?? undefined;
      base.gameNumber = 1;
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

/* ── Page ── */

export default function MultiBoardPage({
  params,
}: {
  params: Promise<{ org: string; layoutId: string }>;
}) {
  const { org, layoutId } = use(params);

  const orgName = org.charAt(0).toUpperCase() + org.slice(1);
  const layout = getLayoutById(layoutId);

  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState("Open Play");
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [queue, setQueue] = useState<QueueGroup[]>([]);

  // Sponsors from localStorage
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) { setSponsors(JSON.parse(saved) as SponsorItem[]); }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch session state from DB ──
  const fetchSession = useCallback(async () => {
    const db = createClient();
    const { data: orgRow } = await db
      .from("organizations")
      .select("id")
      .eq("slug", org)
      .single();
    if (!orgRow) { setLoading(false); return; }

    const { data: session } = await db
      .from("live_sessions")
      .select("*")
      .eq("org_id", orgRow.id)
      .eq("status", "active")
      .maybeSingle();

    if (session) {
      const s = session as LiveSession;
      const state = s.state as LiveSessionState;
      setSessionName(s.name);
      setCourts(sessionCourtsToCourtData(state.courts ?? []));
      setQueue(sessionToQueueGroups(state));
    }
    setLoading(false);
  }, [org]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 10_000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  // Layout not found → show error
  if (!layout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e] p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-2xl">🔲</span>
          </div>
          <h1 className="mb-2 text-xl font-black text-white">Layout Not Found</h1>
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
      courts={courts}
      queue={queue}
      tournament={null}
      bracket={[]}
      orgName={orgName}
      sessionName={sessionName}
      sponsors={sponsors}
    />
  );
}
