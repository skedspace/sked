"use client";

import { Clock } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActiveCourts, type CourtData } from "@/components/board/active-courts";
import { QueueDisplay, type QueueGroup } from "@/components/board/queue-display";
import {
  TournamentInfoPanel,
  type TournamentInfo,
} from "@/components/board/tournament-info";
import {
  TournamentBracket,
  type BracketMatch,
} from "@/components/board/tournament-bracket";
import {
  type MosaicLayoutDef,
  type PanelType,
  PANEL_LABELS,
  PANEL_ICONS,
} from "@/components/board/board-layouts";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { SponsorMarquee, type SponsorItem } from "./sponsor-marquee";

/* ── Props ── */

export interface MultiBoardHostProps {
  layout: MosaicLayoutDef;
  courts: CourtData[];
  queue: QueueGroup[];
  tournament?: TournamentInfo | null;
  bracket?: BracketMatch[];
  orgName: string;
  sessionName?: string;
  sponsors?: SponsorItem[];
  statusText?: string;
  className?: string;
}

/* ── Helpers ── */

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function displayName(name: string): string {
  if (isUuidLike(name)) {
    const prefix = name.split("-")[0];
    if (prefix && prefix !== "00000000") return `Org ${prefix}`;
    return "Dashboard";
  }
  return name;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ── Live Clock ── */

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
      <Clock className="h-3 w-3 text-[#b9f34b]" />
      <span className="tabular-nums">{formatDate(now)}</span>
      <span className="text-white/20">·</span>
      <span className="tabular-nums font-medium text-white/60">
        {formatTime(now)}
      </span>
    </div>
  );
}

/* ── Auto-hide Footer ── */

function AutoHideFooter({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 10_000);
  }, []);

  const show = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div className="absolute -top-8 left-0 right-0 z-0 h-8" />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Panel renderer ── */

function PanelWrapper({
  type,
  data,
  className,
}: {
  type: PanelType;
  data: {
    courts: CourtData[];
    queue: QueueGroup[];
    tournament?: TournamentInfo | null;
    bracket?: BracketMatch[];
  };
  className?: string;
}) {
  const label = PANEL_LABELS[type];
  const icon = PANEL_ICONS[type];

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-clip border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5",
        className,
      )}
    >
      <BorderBeam size={120} duration={12} delay={type === "courts" ? 0 : type === "queue" ? 4 : 8} colorFrom="#b9f34b" colorTo="#5b8def" borderWidth={1} />

      {/* Panel header */}
      <div className="relative mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
            {label}
          </h3>
        </div>
      </div>

      {/* Panel content */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {type === "courts" && (
          <ActiveCourts
            courts={data.courts}
            title=""
            showStats={false}
            className="h-full"
          />
        )}
        {type === "queue" && (
          <QueueDisplay
            groups={data.queue}
            title=""
            className="h-full"
          />
        )}
        {type === "tournament-info" && data.tournament && (
          <TournamentInfoPanel
            tournament={data.tournament}
            compact
          />
        )}
        {type === "tournament-bracket" && (
          <TournamentBracket
            matches={data.bracket ?? []}
            title=""
          />
        )}
        {type === "tournament-info" && !data.tournament && (
          <div className="flex h-full items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
            <p className="text-sm text-white/20">No active tournament</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Build grid classes from layout ── */

function gridClass(layout: MosaicLayoutDef): string {
  if (layout.columns === 1) return "grid-cols-1";
  if (layout.columns === 2) return "grid-cols-1 lg:grid-cols-2";
  if (layout.columns === 3) return "grid-cols-1 lg:grid-cols-3";
  if (layout.columns === 4) return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4";
  return "grid-cols-1 lg:grid-cols-2";
}

function panelSpanClass(panel: { colSpan?: number; rowSpan?: number }): string {
  const spans: string[] = [];
  if (panel.colSpan && panel.colSpan > 1) {
    spans.push(`lg:col-span-${panel.colSpan}`);
  }
  if (panel.rowSpan && panel.rowSpan > 1) {
    spans.push(`lg:row-span-${panel.rowSpan}`);
  }
  return spans.join(" ");
}

/* ── Component ── */

export function MultiBoardHost({
  layout,
  courts,
  queue,
  tournament,
  bracket,
  orgName,
  sessionName,
  sponsors,
  statusText = "Auto-refreshes every 10s - Multi-board mode",
  className,
}: MultiBoardHostProps) {
  const data = { courts, queue, tournament, bracket: bracket ?? [] };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[#0f110e] text-white antialiased",
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="shrink-0 text-base font-black tracking-tight text-[#b9f34b] sm:text-lg">
            {displayName(orgName)}
          </span>
          {sessionName && (
            <>
              <span className="h-5 w-px shrink-0 bg-white/15" />
              <span className="truncate text-sm font-medium text-white/70">
                {sessionName}
              </span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden text-[11px] uppercase tracking-widest text-white/30 sm:inline">
            {layout.name}
          </span>
          <LiveClock />
        </div>
      </header>

      {/* Mosaic Grid */}
      <div
        className={cn(
          "grid flex-1 gap-4 overflow-auto bg-[#0f110e] p-4 sm:p-6",
          gridClass(layout),
        )}
        style={
          layout.columns > 4
            ? ({
                gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {layout.panels.map((panel, idx) => (
          <PanelWrapper
            key={`${panel.type}-${idx}`}
            type={panel.type}
            data={data}
            className={panelSpanClass(panel)}
          />
        ))}
      </div>

      {/* Sponsor marquee */}
      {sponsors && sponsors.length > 0 && (
        <SponsorMarquee sponsors={sponsors} />
      )}

      {/* Auto-hide Footer */}
      <AutoHideFooter>
        <div className="border-t border-white/10 px-4 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between text-xs text-white/25">
            {statusText ? (
              <span>{statusText}</span>
            ) : (
              <>
            <span>Auto-refreshes every 10s · Multi-board mode</span>
            <span>v0.1 · Board View</span>
              </>
            )}
            <span>v0.1 - Board View</span>
          </div>
        </div>
      </AutoHideFooter>
    </div>
  );
}
