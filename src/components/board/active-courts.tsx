"use client";

import { Clock3, LayoutGrid, Users, Volleyball } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { GameTimer, useGameCountdown } from "./game-timer";
import {
  COURT_ACCENTS,
  DotGridCorner,
  MiniCourt,
  PickleballIcon,
  accentAt,
  accentVars,
  type CourtAccent,
} from "./court-visuals";

/* ── Types ── */

export type CourtStatus = "active" | "ready" | "empty";

export type CourtPlayer = {
  name: string;
  rating?: string;
};

export type CourtData = {
  id: string;
  name: string;
  status: CourtStatus;
  teamA?: [CourtPlayer, CourtPlayer];
  teamB?: [CourtPlayer, CourtPlayer];
  startedAt?: string; // ISO string
  durationMinutes: number;
  gameNumber?: number;
  /** Overrides the automatic hue assignment */
  accent?: CourtAccent;
};

export type CourtStats = {
  playersCheckedIn?: number;
  activeGames?: number;
  courtsAvailable?: number;
  avgWaitMinutes?: number;
};

export interface ActiveCourtsProps {
  courts: CourtData[];
  title?: string;
  /** Stats strip under the court grid (reference board shows four tiles) */
  stats?: CourtStats;
  showStats?: boolean;
  className?: string;
}

/* ── Status chrome ── */

const STATUS_LABEL: Record<CourtStatus, string> = {
  active: "Live",
  ready: "Ready",
  empty: "Empty",
};

const STATUS_BADGE: Record<CourtStatus, string> = {
  active: "bg-[#b9f34b]/15 text-[#b9f34b] ring-1 ring-inset ring-[#b9f34b]/30",
  ready: "bg-[#3fd8c2]/15 text-[#3fd8c2] ring-1 ring-inset ring-[#3fd8c2]/30",
  empty: "bg-white/[0.06] text-white/40 ring-1 ring-inset ring-white/10",
};

function StatusBadge({ status }: { status: CourtStatus }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em]",
        STATUS_BADGE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ── Player chip ── */

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PlayerChip({
  player,
  accent,
  align = "left",
}: {
  player: CourtPlayer;
  accent: CourtAccent;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <span
        className="mt-[2px] grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
        style={{
          backgroundColor: `rgb(${COURT_ACCENTS[accent].rgb} / 0.16)`,
          color: COURT_ACCENTS[accent].hex,
        }}
      >
        {initialsOf(player.name)}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-white/90">
          {player.name}
        </span>
        {player.rating && (
          <span className="block text-[11px] leading-tight text-white/35">
            {player.rating}
          </span>
        )}
      </span>
    </div>
  );
}

/* ── Live court card ── */

function LiveCourtCard({ court, accent }: { court: CourtData; accent: CourtAccent }) {
  const theme = COURT_ACCENTS[accent];
  const { label: rotationLabel, phase } = useGameCountdown(
    court.startedAt,
    court.durationMinutes,
  );

  return (
    <article
      style={accentVars(accent)}
      className="relative flex flex-col overflow-hidden rounded-2xl bg-[#151713] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
    >
      <BorderBeam
        size={110}
        duration={10}
        delay={0}
        colorFrom={theme.hex}
        colorTo="transparent"
        borderWidth={1}
      />

      {/* Accent wash behind the header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{
          background: `linear-gradient(180deg, rgb(${theme.rgb} / 0.10), transparent)`,
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 pt-3.5">
        <h3 className="text-[17px] font-bold tracking-tight text-white">
          {court.name}
        </h3>
        <StatusBadge status="active" />
      </div>

      {/* Game number + timer */}
      <div className="relative flex items-center gap-3 px-4 pb-3 pt-2.5">
        {court.gameNumber && (
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
            Game {court.gameNumber}
          </span>
        )}
        <GameTimer
          startedAt={court.startedAt ?? new Date().toISOString()}
          durationMinutes={court.durationMinutes}
          accent={accent}
        />
      </div>

      {/* Court diagram */}
      <div className="relative h-[72px] px-3">
        <MiniCourt accent={accent} />
      </div>

      {/* Line-ups */}
      {court.teamA && court.teamB ? (
        <div className="relative grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3 px-4 pb-3 pt-4">
          <div className="space-y-3">
            <PlayerChip player={court.teamA[0]} accent={accent} />
            <PlayerChip player={court.teamA[1]} accent={accent} />
          </div>

          <span
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white/40"
            aria-label="versus"
          >
            vs
          </span>

          <div className="space-y-3">
            <PlayerChip player={court.teamB[0]} accent={accent} />
            <PlayerChip player={court.teamB[1]} accent={accent} />
          </div>
        </div>
      ) : (
        <div className="flex-1 px-4 pb-3 pt-4 text-center text-sm text-white/25">
          Line-up pending
        </div>
      )}

      {/* Rotation footer */}
      <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-2.5">
        <span className="text-[12px] text-white/40">Next rotation in</span>
        <span
          className={cn(
            "font-mono text-[13px] font-bold tabular-nums",
            phase === "overtime" ? "text-[#ff6b4a]" : "text-white/70",
          )}
        >
          {rotationLabel}
        </span>
      </div>
    </article>
  );
}

/* ── Open court card (ready / empty) ── */

function OpenCourtCard({
  court,
}: {
  court: CourtData;
}) {
  const isReady = court.status === "ready";

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl bg-[#151713] px-5 pb-5 pt-3.5",
        isReady
          ? "border border-[#3fd8c2]/40"
          : "border border-white/10",
      )}
    >
      {isReady && (
        <BorderBeam
          size={90}
          duration={12}
          delay={2}
          colorFrom="#3fd8c2"
          colorTo="transparent"
          borderWidth={1}
        />
      )}
      <DotGridCorner />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <h3 className="text-[17px] font-bold tracking-tight text-white">
          {court.name}
        </h3>
        <StatusBadge status={court.status} />
      </div>

      {/* Placeholder mark + copy */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-1 py-6">
        <PickleballIcon
          className={cn(
            "mb-2 h-14 w-14 -rotate-12",
            isReady ? "text-[#3fd8c2]/25" : "text-white/[0.14]",
          )}
        />
        <p
          className={cn(
            "text-[15px] font-bold",
            isReady ? "text-white" : "text-white/70",
          )}
        >
          {isReady ? "Ready to play!" : "Court available"}
        </p>
        <p className="text-[12px] text-white/35">
          {isReady ? "Waiting for players to start" : "Be the first to book"}
        </p>
      </div>
    </article>
  );
}

/* ── Stats strip ── */

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#b9f34b]/10 text-[#b9f34b]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[19px] font-bold leading-tight tabular-nums text-white">
          {value}
        </span>
        <span className="block truncate text-[11px] leading-tight text-white/35">
          {label}
        </span>
      </span>
    </div>
  );
}

function StatsStrip({ stats }: { stats: Required<CourtStats> }) {
  return (
    <div className="grid grid-cols-2 divide-white/10 rounded-2xl border border-white/10 bg-[#151713] sm:grid-cols-4 sm:divide-x">
      <StatTile
        icon={<Users className="h-[18px] w-[18px]" />}
        value={String(stats.playersCheckedIn)}
        label="Players Checked In"
      />
      <StatTile
        icon={<LayoutGrid className="h-[18px] w-[18px]" />}
        value={String(stats.activeGames)}
        label="Active Games"
      />
      <StatTile
        icon={<Volleyball className="h-[18px] w-[18px]" />}
        value={String(stats.courtsAvailable)}
        label="Courts Available"
      />
      <StatTile
        icon={<Clock3 className="h-[18px] w-[18px]" />}
        value={`${stats.avgWaitMinutes} min`}
        label="Avg. Wait Time"
      />
    </div>
  );
}

/* ── Component ── */

export function ActiveCourts({
  courts,
  title = "Active Courts",
  stats,
  showStats = true,
  className,
}: ActiveCourtsProps) {
  const live = courts.filter((c) => c.status === "active");
  const open = courts.filter((c) => c.status !== "active");

  const resolvedStats: Required<CourtStats> = {
    playersCheckedIn: stats?.playersCheckedIn ?? live.length * 4,
    activeGames: stats?.activeGames ?? live.length,
    courtsAvailable: stats?.courtsAvailable ?? courts.length,
    avgWaitMinutes: stats?.avgWaitMinutes ?? 0,
  };

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {title && (
        <header className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {title}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b9f34b]/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b9f34b] animate-sked-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#b9f34b]">
              {courts.length}
            </span>
          </span>
        </header>
      )}

      {courts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#151713] py-16">
          <p className="text-sm text-white/20">No courts active</p>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {live.map((court, idx) => (
                <LiveCourtCard
                  key={court.id}
                  court={court}
                  accent={court.accent ?? accentAt(idx)}
                />
              ))}
            </div>
          )}

          {open.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {open.map((court) => (
                <OpenCourtCard
                  key={court.id}
                  court={court}
                />
              ))}
            </div>
          )}

          {showStats && <StatsStrip stats={resolvedStats} />}
        </>
      )}
    </section>
  );
}
