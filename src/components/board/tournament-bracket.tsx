"use client";

import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";

/* ── Types ── */

export type BracketMatch = {
  id: string;
  round: number;           // 1 = first round, 2 = quarterfinals, etc.
  position: number;        // position within the round (0-indexed)
  teamA: string | null;
  teamB: string | null;
  scoreA?: string | null;
  scoreB?: string | null;
  winner?: "A" | "B" | null;
};

export interface TournamentBracketProps {
  matches: BracketMatch[];
  title?: string;
  className?: string;
}

/* ── Helpers ── */

function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

/* ── Team slot ── */

function TeamSlot({
  name,
  score,
  isWinner,
  side,
}: {
  name: string | null;
  score?: string | null;
  isWinner: boolean;
  side: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
        isWinner
          ? "border-[#b9f34b]/30 bg-[#b9f34b]/10 text-white"
          : "border-white/10 bg-[#151713] text-white/60",
        side === "bottom" && "mt-px",
      )}
    >
      <span className="flex-1 truncate text-sm font-medium">
        {name ?? "—"}
      </span>
      {score !== undefined && score !== null && (
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            isWinner ? "text-[#b9f34b]" : "text-white/30",
          )}
        >
          {score || "—"}
        </span>
      )}
    </div>
  );
}

/* ── Match card ── */

function MatchCard({
  match,
  totalRounds,
}: {
  match: BracketMatch;
  roundIndex: number;
  totalRounds: number;
}) {
  return (
    <div className="relative w-52 shrink-0">
      {/* Round label (show on first match of each round) */}
      {match.position === 0 && (
        <div className="mb-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
            {roundLabel(match.round, totalRounds)}
          </span>
        </div>
      )}

      {/* Match card */}
      <div className="relative overflow-clip bg-[#151713] p-2">
        {match.winner && (
          <BorderBeam size={60} duration={10} delay={0} colorFrom="#b9f34b" colorTo="#5b8def" borderWidth={1} />
        )}
        <TeamSlot
          name={match.teamA}
          score={match.scoreA}
          isWinner={match.winner === "A"}
          side="top"
        />
        <TeamSlot
          name={match.teamB}
          score={match.scoreB}
          isWinner={match.winner === "B"}
          side="bottom"
        />
      </div>
    </div>
  );
}

/* ── Component ── */

export function TournamentBracket({
  matches,
  title = "Tournament Bracket",
  className,
}: TournamentBracketProps) {
  if (matches.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
          {title}
        </h2>
        <div className="flex flex-1 items-center justify-center border border-dashed border-white/10 bg-[#151713]">
          <p className="text-sm text-white/20">No bracket data yet</p>
        </div>
      </div>
    );
  }

  // Group matches by round
  const roundMap = new Map<number, BracketMatch[]>();
  let maxRound = 0;
  for (const m of matches) {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
    if (m.round > maxRound) maxRound = m.round;
  }

  const rounds = Array.from(roundMap.entries()).sort(
    ([a], [b]) => a - b,
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
        {title}
      </h2>

      <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
        {rounds.map(([round, roundMatches]) => (
          <div key={round} className="flex flex-col justify-center gap-4">
            {roundMatches
              .sort((a, b) => a.position - b.position)
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  roundIndex={round}
                  totalRounds={maxRound}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
