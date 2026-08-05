"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";

/* ── Types ── */

export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "pool_play";

export type TournamentStatus =
  | "draft"
  | "registration"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TournamentInfo = {
  id: string;
  name: string;
  format: TournamentFormat;
  skillLevel: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  participants: number;
  maxParticipants: number;
  matchCount: number;
  completedMatches: number;
  description: string;
  entryFee: string;
  currentRound?: string;
};

export interface TournamentInfoPanelProps {
  tournament: TournamentInfo;
  compact?: boolean;
  className?: string;
}

/* ── Helpers ── */

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  pool_play: "Pool Play + Bracket",
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  registration: "Registration Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<TournamentStatus, string> = {
  draft: "bg-white/5 text-white/30",
  registration: "bg-[#5b8def]/15 text-[#5b8def]",
  in_progress: "bg-[#b9f34b]/15 text-[#b9f34b]",
  completed: "bg-white/5 text-white/30",
  cancelled: "bg-red-400/10 text-red-400/60",
};

/* ── Stat tile ── */

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="relative overflow-clip bg-[#151713] px-4 py-3">
      <BorderBeam size={60} duration={15} delay={0} colorFrom="#b9f34b" colorTo="#5b8def" borderWidth={0.5} />
      <div className="relative flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-white/30" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
          {label}
        </span>
      </div>
      <span className="mt-1 block text-lg font-bold text-white/90">
        {value}
      </span>
    </div>
  );
}

/* ── Progress bar ── */

function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">Match progress</span>
        <span className="font-mono text-white/60">
          {current}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#b9f34b] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Component ── */

export function TournamentInfoPanel({
  tournament,
  compact = false,
  className,
}: TournamentInfoPanelProps) {
  const isActive = tournament.status === "in_progress";
  const isRegistering = tournament.status === "registration";

  if (compact) {
    return (
      <div
        className={cn(
          "relative overflow-clip bg-[#151713] px-5 py-3",
          className,
        )}
      >
        <BorderBeam size={100} duration={12} delay={0} colorFrom="#b9f34b" colorTo="#5b8def" borderWidth={1} />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9f34b]/10 text-lg">
          🏆
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="relative flex items-center gap-2">
            <span className="truncate text-sm font-bold text-white/90">
              {tournament.name}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                STATUS_BADGE[tournament.status],
              )}
            >
              {STATUS_LABELS[tournament.status]}
            </span>
          </div>
          <div className="relative mt-0.5 flex items-center gap-3 text-xs text-white/40">
            <span>{FORMAT_LABELS[tournament.format]}</span>
            <span>{tournament.participants} players</span>
            {(isActive || tournament.status === "completed") && (
              <span className="font-mono">
                {tournament.completedMatches}/{tournament.matchCount} matches
              </span>
            )}
          </div>
        </div>
        {(isActive || isRegistering) && (
          <span className="relative flex h-6 items-center rounded-full bg-[#b9f34b]/15 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#b9f34b]">
            {isActive ? "Live" : "Open"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
          Tournament
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            STATUS_BADGE[tournament.status],
          )}
        >
          {STATUS_LABELS[tournament.status]}
        </span>
      </div>

      {/* Main card */}
      <div className="relative space-y-4 overflow-clip bg-[#151713] p-5">
        <BorderBeam size={150} duration={15} delay={0} colorFrom="#b9f34b" colorTo="#5b8def" borderWidth={1} />
        {/* Title + format */}
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#b9f34b]/10 text-xl">
            🏆
          </span>
          <div className="relative min-w-0">
            <h3 className="text-lg font-black tracking-tight text-white">
              {tournament.name}
            </h3>
            <p className="relative mt-0.5 text-sm text-white/50">
              {FORMAT_LABELS[tournament.format]}
              {tournament.currentRound && (
                <> · {tournament.currentRound}</>
              )}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="relative text-sm leading-relaxed text-white/60">
          {tournament.description}
        </p>

        {/* Stats grid */}
        <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            icon={Users}
            label="Participants"
            value={`${tournament.participants}/${tournament.maxParticipants}`}
          />
          <StatTile
            icon={Trophy}
            label="Skill Level"
            value={tournament.skillLevel}
          />
          <StatTile
            icon={CalendarDays}
            label="Dates"
            value={
              !tournament.startDate || !tournament.endDate
                ? "—"
                : tournament.startDate === tournament.endDate
                  ? format(new Date(`${tournament.startDate}T12:00:00`), "MMM d")
                  : `${format(new Date(`${tournament.startDate}T12:00:00`), "MMM d")}–${format(new Date(`${tournament.endDate}T12:00:00`), "d")}`
            }
          />
          <StatTile icon={Swords} label="Entry" value={tournament.entryFee} />
        </div>

        {/* Progress */}
        {(isActive || tournament.status === "completed") && (
          <div className="relative">
            <ProgressBar
              current={tournament.completedMatches}
              total={tournament.matchCount}
            />
          </div>
        )}
      </div>
    </div>
  );
}
