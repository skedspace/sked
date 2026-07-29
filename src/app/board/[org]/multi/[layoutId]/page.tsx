"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { MultiBoardHost } from "@/components/board/multi-board-host";
import { getLayoutById } from "@/components/board/board-layouts";
import { type CourtData, type CourtPlayer } from "@/components/board/active-courts";
import { type QueueGroup } from "@/components/board/queue-display";
import { type SponsorItem } from "@/components/board/sponsor-marquee";
import { createClient } from "@/lib/supabase/client";
import type { LiveSession, LiveSessionState } from "@/lib/session-actions";
import {
  formatCachedAt,
  loadCachedBoardState,
  saveCachedBoardState,
} from "@/lib/board-offline-cache";

type OrgRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

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

function sessionCourtsToCourtData(courts: LiveSessionState["courts"]): CourtData[] {
  return courts.map((c) => {
    const base: CourtData = {
      id: c.courtId,
      name: c.courtName,
      status: c.status,
      durationMinutes: c.durationMinutes,
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

export default function MultiBoardPage({
  params,
}: {
  params: Promise<{ org: string; layoutId: string }>;
}) {
  const { org, layoutId } = use(params);
  const layout = getLayoutById(layoutId);
  const fallbackOrgName = titleizeSlug(org);

  const [sessionName, setSessionName] = useState("Open Play");
  const [orgName, setOrgName] = useState(fallbackOrgName);
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [queue, setQueue] = useState<QueueGroup[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    const cached = loadCachedBoardState(org);
    if (cached) {
      setOrgName(cached.orgName);
      setSessionName(cached.sessionName);
      setCourts(cached.courts);
      setQueue(cached.queue);
      setSponsors(cached.sponsors);
      setCachedAt(cached.savedAt);
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
        return;
      }

      const [settingsResult, sessionResult] = await Promise.all([
        db
          .from("org_settings")
          .select("board_sponsors")
          .eq("org_id", orgRow.id)
          .maybeSingle(),
        db
          .from("live_sessions")
          .select("*")
          .eq("org_id", orgRow.id)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      const session = sessionResult.data;
      const nextSponsors = safeSponsors(settingsResult.data?.board_sponsors);

      const nextOrgName = orgRow.name ?? fallbackOrgName;
      let nextSessionName = "No Active Session";
      let nextCourts: CourtData[] = [];
      let nextQueue: QueueGroup[] = [];

      if (session) {
        const liveSession = session as LiveSession;
        const state = liveSession.state as LiveSessionState;
        nextSessionName = liveSession.name;
        nextCourts = sessionCourtsToCourtData(state.courts ?? []);
        nextQueue = sessionToQueueGroups(state);
      }

      setOrgName(nextOrgName);
      setSessionName(nextSessionName);
      setCourts(nextCourts);
      setQueue(nextQueue);
      setSponsors(nextSponsors);
      setOffline(false);
      setCachedAt(null);

      saveCachedBoardState(org, {
        orgName: nextOrgName,
        sessionName: nextSessionName,
        courts: nextCourts,
        queue: nextQueue,
        tournament: null,
        bracket: [],
        sponsors: nextSponsors,
      });
    } catch {
      const cached = loadCachedBoardState(org);
      if (cached) {
        setOrgName(cached.orgName);
        setSessionName(cached.sessionName);
        setCourts(cached.courts);
        setQueue(cached.queue);
        setSponsors(cached.sponsors);
        setCachedAt(cached.savedAt);
      }
      setOffline(true);
    }
  }, [fallbackOrgName, org]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 10_000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  if (!layout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f110e] p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-2xl">?</span>
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

  const cachedTime = formatCachedAt(cachedAt);
  const statusText = offline
    ? `Offline${cachedTime ? ` - Last updated ${cachedTime}` : ""}`
    : "Auto-refreshes every 10s - Multi-board mode";

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
      statusText={statusText}
    />
  );
}
