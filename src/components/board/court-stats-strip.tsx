"use client";

import { Clock3, LayoutGrid, Users, Volleyball } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";

/* ── Types ── */

export interface CourtStats {
  playersCheckedIn?: number;
  activeGames?: number;
  courtsAvailable?: number;
  avgWaitMinutes?: number;
}

/* ── Tile ── */

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
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
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

/* ── Strip ── */

export interface CourtStatsStripProps {
  stats?: CourtStats;
  className?: string;
}

export function CourtStatsStrip({ stats, className }: CourtStatsStripProps) {
  const resolved: Required<CourtStats> = {
    playersCheckedIn: stats?.playersCheckedIn ?? 0,
    activeGames: stats?.activeGames ?? 0,
    courtsAvailable: stats?.courtsAvailable ?? 0,
    avgWaitMinutes: stats?.avgWaitMinutes ?? 0,
  };

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 divide-white/10 overflow-hidden rounded-2xl bg-[#151713] sm:grid-cols-4 sm:divide-x",
        className,
      )}
    >
      <BorderBeam
        size={100}
        duration={12}
        colorFrom="#b9f34b"
        colorTo="#5b8def"
        borderWidth={1}
      />
      <StatTile
        icon={<Users className="h-[18px] w-[18px]" />}
        value={String(resolved.playersCheckedIn)}
        label="Players Checked In"
      />
      <StatTile
        icon={<LayoutGrid className="h-[18px] w-[18px]" />}
        value={String(resolved.activeGames)}
        label="Active Games"
      />
      <StatTile
        icon={<Volleyball className="h-[18px] w-[18px]" />}
        value={String(resolved.courtsAvailable)}
        label="Courts Available"
      />
      <StatTile
        icon={<Clock3 className="h-[18px] w-[18px]" />}
        value={`${resolved.avgWaitMinutes} min`}
        label="Avg. Wait Time"
      />
    </div>
  );
}
