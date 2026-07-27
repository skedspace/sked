"use client";

import { ChevronRight, Lock, RotateCcw, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  COURT_ACCENTS,
  accentAt,
  accentVars,
  type CourtAccent,
} from "./court-visuals";

/* ── Types ── */

export type QueueGroupStatus = "on-deck" | "waiting" | "returned";

export type QueuePlayer = {
  name: string;
  rating?: string;
  isLocked?: boolean; // partner lock
};

export type QueueGroup = {
  id: string;
  label: string; // e.g. "Group 2", "Up Next"
  players: QueuePlayer[];
  status: QueueGroupStatus;
  position: number; // ordering
  /** Overrides the automatic hue assignment */
  accent?: CourtAccent;
  /** Estimated minutes until this group is called on */
  etaMinutes?: number;
  /** For returned groups: how long ago they came off a court */
  returnedAgoMinutes?: number;
};

export interface QueueDisplayProps {
  groups: QueueGroup[];
  title?: string;
  /** Click-through on the "Up Next" header */
  onOpenQueue?: () => void;
  className?: string;
}

/* ── Helpers ── */

const STATUS_LABEL: Record<QueueGroupStatus, string> = {
  "on-deck": "Up Next",
  waiting: "Waiting",
  returned: "Returned",
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ── Player row ── */

function PlayerRow({
  player,
  accent,
  index,
}: {
  player: QueuePlayer;
  accent: CourtAccent;
  /** 1-based rank — only shown in the "Up Next" card */
  index?: number;
}) {
  const theme = COURT_ACCENTS[accent];

  return (
    <li className="flex items-center gap-2.5">
      {index !== undefined && (
        <span className="w-4 shrink-0 text-center font-mono text-[11px] font-bold text-white/30">
          {index}
        </span>
      )}
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold"
        style={{
          backgroundColor: `rgb(${theme.rgb} / 0.16)`,
          color: theme.hex,
        }}
      >
        {initialsOf(player.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/80">
        {player.name}
      </span>
      {player.isLocked && (
        <Lock
          className="h-3 w-3 shrink-0 text-amber-400/70"
          aria-label="Partner locked"
        />
      )}
      {player.rating && (
        <span className="shrink-0 font-mono text-[11px] text-white/35">
          {player.rating}
        </span>
      )}
    </li>
  );
}

/* ── Side meta column ── */

function GroupMeta({
  accent,
  icon,
  headline,
  caption,
  value,
  highlight = false,
}: {
  accent: CourtAccent;
  icon: React.ReactNode;
  headline?: string;
  caption: string;
  value: string;
  highlight?: boolean;
}) {
  const theme = COURT_ACCENTS[accent];

  return (
    <div className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-1 border-l border-white/10 pl-3 text-center">
      <span style={{ color: theme.hex }}>{icon}</span>
      {headline && (
        <span
          className="text-[11px] font-bold leading-tight"
          style={{ color: highlight ? theme.hex : undefined }}
        >
          {headline}
        </span>
      )}
      <span className="text-[10px] leading-tight text-white/35">{caption}</span>
      <span
        className="font-mono text-[11px] font-bold leading-tight"
        style={{ color: theme.hex }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Up Next hero card ── */

function UpNextCard({
  group,
  onOpenQueue,
}: {
  group: QueueGroup;
  onOpenQueue?: () => void;
}) {
  const accent: CourtAccent = group.accent ?? "lime";
  const theme = COURT_ACCENTS[accent];

  return (
    <article
      style={accentVars(accent)}
      className="relative overflow-hidden rounded-2xl bg-[#151713]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: `inset 0 0 0 1px rgb(${theme.rgb} / 0.45)` }}
      />
      <BorderBeam
        size={90}
        duration={9}
        colorFrom={theme.hex}
        colorTo="transparent"
        borderWidth={1}
      />

      {/* Header bar */}
      <button
        type="button"
        onClick={onOpenQueue}
        disabled={!onOpenQueue}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left transition-colors disabled:cursor-default"
        style={{ backgroundColor: `rgb(${theme.rgb} / 0.16)` }}
      >
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">
          Up Next
        </span>
        <ChevronRight className="h-4 w-4 text-white/60" />
      </button>

      {/* Body */}
      <div
        className="flex gap-3 p-3.5"
        style={{ backgroundColor: `rgb(${theme.rgb} / 0.05)` }}
      >
        <ol className="min-w-0 flex-1 space-y-2">
          {group.players.map((player, idx) => (
            <PlayerRow
              key={`${group.id}-${idx}`}
              player={player}
              accent={accent}
              index={idx + 1}
            />
          ))}
        </ol>

        <GroupMeta
          accent={accent}
          icon={<UsersRound className="h-6 w-6" />}
          headline="You're up next!"
          caption="Est. wait time"
          value={group.etaMinutes ? `~ ${group.etaMinutes} min` : "Any moment"}
          highlight
        />
      </div>
    </article>
  );
}

/* ── Standard group card ── */

function GroupCard({ group, accent }: { group: QueueGroup; accent: CourtAccent }) {
  const theme = COURT_ACCENTS[accent];
  const isReturned = group.status === "returned";

  return (
    <article
      style={accentVars(accent)}
      className="relative overflow-hidden rounded-2xl bg-[#151713]"
    >
      <BorderBeam
        size={80}
        duration={10}
        delay={isReturned ? 6 : 2}
        colorFrom={theme.hex}
        colorTo="transparent"
        borderWidth={1}
      />
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3.5 py-2"
        style={{ backgroundColor: `rgb(${theme.rgb} / 0.12)` }}
      >
        <span className="text-[13px] font-bold text-white">{group.label}</span>
        <span
          className="rounded-md px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{
            backgroundColor: `rgb(${theme.rgb} / 0.18)`,
            color: theme.hex,
          }}
        >
          {STATUS_LABEL[group.status]}
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-3 p-3.5">
        <ul className="min-w-0 flex-1 space-y-2">
          {group.players.map((player, idx) => (
            <PlayerRow
              key={`${group.id}-${idx}`}
              player={player}
              accent={accent}
            />
          ))}
        </ul>

        {isReturned ? (
          <GroupMeta
            accent={accent}
            icon={<RotateCcw className="h-6 w-6" />}
            caption="Returned to queue"
            value={
              group.returnedAgoMinutes
                ? `~ ${group.returnedAgoMinutes} min ago`
                : "Just now"
            }
          />
        ) : (
          <GroupMeta
            accent={accent}
            icon={<UsersRound className="h-6 w-6" />}
            headline={`${group.players.length} players`}
            caption="Est. wait time"
            value={group.etaMinutes ? `~ ${group.etaMinutes} min` : "TBD"}
          />
        )}
      </div>
    </article>
  );
}

/* ── Component ── */

export function QueueDisplay({
  groups,
  title = "Queue & Groups",
  onOpenQueue,
  className,
}: QueueDisplayProps) {
  const sorted = [...groups].sort((a, b) => a.position - b.position);
  const first = sorted[0];
  const rest = sorted.slice(1);
  // Players still waiting for a court — groups that just came off don't count.
  const waitingCount = sorted.reduce(
    (sum, g) => (g.status === "returned" ? sum : sum + g.players.length),
    0,
  );

  if (!first) {
    return (
      <section className={cn("flex flex-col gap-4", className)}>
        {title && (
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {title}
          </h2>
        )}
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#151713] py-16">
          <p className="text-sm text-white/20">No groups in queue</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title && (
        <header className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {title}
          </h2>
          <span className="text-[11px] text-white/35">
            {waitingCount} waiting
          </span>
        </header>
      )}

      <UpNextCard
        group={{ ...first, status: "on-deck" }}
        onOpenQueue={onOpenQueue}
      />

      {rest.length > 0 && (
        <>
          <header className="flex items-center justify-between pt-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
              Groups
            </h3>
            <span className="text-[11px] text-white/35">
              {rest.length} {rest.length === 1 ? "group" : "groups"}
            </span>
          </header>

          <div className="space-y-3">
            {rest.map((group, idx) => (
              <GroupCard
                key={group.id}
                group={group}
                accent={
                  group.accent ??
                  (group.status === "returned" ? "amber" : accentAt(idx + 2))
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
