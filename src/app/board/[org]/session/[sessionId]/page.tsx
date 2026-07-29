"use client";

import { use, useCallback, useEffect, useState } from "react";
import { BoardLayout, type BoardMeta } from "@/components/board/board-layout";
import { BorderBeam } from "@/components/ui/border-beam";
import { ActiveCourts, type CourtData, type CourtPlayer } from "@/components/board/active-courts";
import { QueueDisplay, type QueueGroup } from "@/components/board/queue-display";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import { createClient } from "@/lib/supabase/client";
import type { LiveSessionState, LiveSession } from "@/lib/session-actions";

function safeSponsors(value: unknown): SponsorItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SponsorItem => {
    if (!item || typeof item !== "object") return false;
    const sponsor = item as Partial<SponsorItem>;
    return (
      typeof sponsor.id === "string" &&
      (sponsor.type === "text" || sponsor.type === "logo") &&
      typeof sponsor.content === "string" &&
      sponsor.content.trim().length > 0
    );
  });
}

/* ── Helpers to transform session state (shared with main board) ── */

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
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState("Loading…");
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [queue, setQueue] = useState<QueueGroup[]>([]);

  // Validate token on mount
  const validate = useCallback(async () => {
    if (!token) { setValid(false); return; }
    try {
      const res = await fetch(`/api/board/share?token=${encodeURIComponent(token)}`);
      if (!res.ok) { setValid(false); return; }
      const data = await res.json();
      setValid(data.sessionId === sessionId && (data.orgSlug ?? data.orgId) === org);
    } catch { setValid(false); }
  }, [token, sessionId, org]);

  useEffect(() => { validate(); }, [validate]);

  // ── Fetch session state from DB ──
  const fetchSession = useCallback(async () => {
    const db = createClient();
    const { data: orgRow } = await db
      .from("organizations")
      .select("id")
      .eq("slug", org)
      .single();
    if (!orgRow) { setLoading(false); return; }

    const [settingsResult, sessionResult] = await Promise.all([
      db
        .from("org_settings")
        .select("board_sponsors")
        .eq("org_id", orgRow.id)
        .maybeSingle(),
      db
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("org_id", orgRow.id)
        .single(),
    ]);

    const session = sessionResult.data;
    setSponsors(safeSponsors(settingsResult.data?.board_sponsors));

    if (session) {
      const s = session as LiveSession;
      const state = s.state as LiveSessionState;
      setSessionName(s.name);
      setCourts(sessionCourtsToCourtData(state.courts ?? []));
      setQueue(sessionToQueueGroups(state));
    }
    setLoading(false);
  }, [org, sessionId]);

  // Initial fetch + poll every 10s
  useEffect(() => {
    if (valid === true) {
      fetchSession();
      const interval = setInterval(fetchSession, 10_000);
      return () => clearInterval(interval);
    }
  }, [valid, fetchSession]);

  // Invalid state
  if (valid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e] p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="mb-2 text-xl font-black text-white">Invalid or Expired Link</h1>
          <p className="text-sm text-white/40">This share link is invalid or has expired. Ask the front desk for a new link.</p>
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
    sessionName,
    view: "courts-queue",
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
          <ActiveCourts courts={courts} />
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
      footer={
        <div className="flex items-center justify-between text-xs text-white/25">
          <span>Shared Board · Auto-refreshes every 10s</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#b9f34b]" />
            Connected
          </span>
        </div>
      }
    />
  );
}
