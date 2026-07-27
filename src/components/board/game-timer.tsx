"use client";

import { differenceInSeconds } from "date-fns";
import { Clock, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { COURT_ACCENTS, type CourtAccent } from "./court-visuals";

/* ── Types ── */

export type CountdownPhase = "normal" | "closing" | "final" | "overtime";

export type Countdown = {
  /** Seconds left in the game, floored at 0 */
  remaining: number;
  /** "mm:ss", or "OT" once the game runs long */
  label: string;
  /** 0 → 1 progress through the scheduled duration */
  fraction: number;
  phase: CountdownPhase;
};

/* ── Helpers ── */

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Hook ──
 * Shared by the header timer and the "next rotation" footer so both read
 * exactly the same second.
 */

export function useGameCountdown(
  startedAt: string | undefined,
  durationMinutes: number,
): Countdown {
  const total = Math.max(0, durationMinutes * 60);
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    if (!startedAt) {
      setRemaining(total);
      return;
    }

    const tick = () => {
      setRemaining(
        Math.max(0, total - differenceInSeconds(new Date(), new Date(startedAt))),
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, total]);

  const fraction = total > 0 ? (total - remaining) / total : 0;
  const phase: CountdownPhase =
    remaining <= 0
      ? "overtime"
      : remaining <= 60
        ? "final"
        : remaining <= 5 * 60
          ? "closing"
          : "normal";

  return {
    remaining,
    label: phase === "overtime" ? "OT" : formatTimer(remaining),
    fraction,
    phase,
  };
}

/* ── Props ── */

interface GameTimerProps {
  startedAt: string; // ISO string
  durationMinutes: number;
  /** Court hue — used while the clock is still comfortably ahead of schedule */
  accent?: CourtAccent;
  /** "chip" is the board card treatment; "ring" keeps the old progress dial */
  variant?: "chip" | "ring";
  className?: string;
}

/* ── Phase colours ── */

function phaseColor(phase: CountdownPhase, accent: CourtAccent): string {
  if (phase === "overtime") return "#ff6b4a";
  if (phase === "final") return "#f5a524";
  if (phase === "closing") return COURT_ACCENTS[accent].hex;
  return "#ffffff";
}

/* ── Component ── */

export function GameTimer({
  startedAt,
  durationMinutes,
  accent = "lime",
  variant = "chip",
  className,
}: GameTimerProps) {
  const { label, fraction, phase } = useGameCountdown(startedAt, durationMinutes);
  const color = phaseColor(phase, accent);
  const showIcon = phase !== "closing";

  if (variant === "ring") {
    const r = 15;
    const circumference = 2 * Math.PI * r;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <svg className="h-8 w-8 shrink-0 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-white/10"
          />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(fraction, 1))}
            className="transition-all duration-500"
          />
        </svg>
        <span
          className="font-mono text-lg font-bold tabular-nums tracking-tight"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      title={phase === "overtime" ? "Game is running long" : undefined}
    >
      {showIcon &&
        (phase === "overtime" ? (
          <TimerReset
            className="h-4 w-4 shrink-0 animate-sked-pulse"
            style={{ color }}
          />
        ) : (
          <Clock
            className={cn("h-4 w-4 shrink-0", phase === "final" && "animate-sked-pulse")}
            style={{ color }}
          />
        ))}
      <span
        className={cn(
          "font-mono text-[22px] font-bold leading-none tabular-nums tracking-tight",
          phase === "final" && "animate-sked-pulse",
        )}
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
