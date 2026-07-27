"use client";

import { Rss, Sun, Trophy } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { BorderBeam } from "@/components/ui/border-beam";
import { BoardSponsorBar } from "./board-sponsor-bar";
import { type SponsorItem } from "./sponsor-marquee";

/* ── Types ── */

export type BoardView =
  | "courts-queue"
  | "courts-tournament"
  | "queue-tournament"
  | "triple"
  | "full-courts"
  | "full-bracket";

export type BoardMeta = {
  orgName: string;
  sessionName: string;
  view: BoardView;
  tournamentName?: string | null;
  /** Big title in the header — defaults to "Gameboard" */
  boardTitle?: string;
  /** Line under the title */
  tagline?: string;
  /** Unread count on the header bell; hidden when 0/undefined */
  alerts?: number;
};

/* ── Props ── */

interface BoardLayoutProps {
  meta: BoardMeta;
  courtsPanel: ReactNode;
  queuePanel: ReactNode;
  tournamentPanel?: ReactNode;
  footer?: ReactNode;
  sponsors?: SponsorItem[];
  className?: string;
}

/* ── Grid classes per view ──
 * Courts get roughly two thirds of the width; the queue rail takes the rest.
 */

const VIEW_GRIDS: Record<BoardView, string> = {
  "courts-queue": "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "courts-tournament": "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "queue-tournament": "grid-cols-1 lg:grid-cols-2",
  triple: "grid-cols-1 lg:grid-cols-3",
  "full-courts": "grid-cols-1",
  "full-bracket": "grid-cols-1",
};

/** Which panels each view puts on screen, in order. */
type PanelSlot = "courts" | "queue" | "tournament";

const VIEW_SLOTS: Record<BoardView, PanelSlot[]> = {
  "courts-queue": ["courts", "queue"],
  "courts-tournament": ["courts", "tournament"],
  "queue-tournament": ["queue", "tournament"],
  triple: ["courts", "queue", "tournament"],
  "full-courts": ["courts"],
  "full-bracket": ["tournament"],
};

const VIEW_LABELS: Record<BoardView, string> = {
  "courts-queue": "Courts + Queue",
  "courts-tournament": "Courts + Tournament",
  "queue-tournament": "Queue + Tournament",
  triple: "Triple View",
  "full-courts": "Active Courts",
  "full-bracket": "Tournament Bracket",
};

/* ── Helpers ── */

/** Check if a string looks like a UUID (or mock UUID with many zeros). */
function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

/** Display name: UUID-ish org slugs are not worth showing on a wall display. */
function displayName(name: string): string | null {
  if (isUuidLike(name)) return null;
  return name;
}

/** Format a Date to a friendly time string like "2:30 PM" */
function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a Date to a friendly date string like "Mon, Jul 27" */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ── Header pill ── */

function HeaderPill({
  icon,
  children,
  tone = "neutral",
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
        tone === "accent"
          ? "border-[#b9f34b]/25 bg-[#b9f34b]/10 text-[#b9f34b]"
          : "border-white/10 bg-white/[0.04] text-white/70",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ── Live Clock ── */

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px]">
      <span className="tabular-nums text-white/50">
        {now ? formatDate(now) : "—"}
      </span>
      <span className="text-white/20">·</span>
      <span className="font-semibold tabular-nums text-white">
        {now ? formatTime(now) : "—"}
      </span>
    </div>
  );
}

/* ── Auto-hide Footer ── */

function AutoHideFooter({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
    }, 10_000);
  }, []);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  // Start the hide timer on mount
  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  return (
    <div
      ref={areaRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {/* Invisible hover target extending above for easier mouse detection */}
      <div className="absolute -top-8 left-0 right-0 z-0 h-8" />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none invisible translate-y-2 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Panel shell ── */

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-clip rounded-3xl bg-[#151713] p-4 sm:p-5",
        className,
      )}
    >
      <BorderBeam
        size={120}
        duration={12}
        colorFrom="#b9f34b"
        colorTo="#5b8def"
        borderWidth={1}
      />
      <div className="relative min-h-0 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

/* ── Component ── */

export function BoardLayout({
  meta,
  courtsPanel,
  queuePanel,
  tournamentPanel,
  footer,
  sponsors,
  className,
}: BoardLayoutProps) {
  const gridClass = VIEW_GRIDS[meta.view];
  const org = displayName(meta.orgName);

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col overflow-hidden bg-[#0a0c08] text-white antialiased selection:bg-[#b9f34b]/30",
        className,
      )}
    >
      {/* ── Animated background beams ── */}
      <BackgroundBeams className="opacity-60" />

      {/* ── Content layer ── */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-black leading-none tracking-tight text-white sm:text-[30px]">
              {meta.boardTitle ?? "Gameboard"}
            </h1>
            <p className="mt-1 truncate text-[12px] text-white/40">
              {meta.tagline ?? "Live court status & player rotation"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {org && (
              <HeaderPill icon={<span className="text-sm">🏟️</span>}>
                {org}
              </HeaderPill>
            )}
            <HeaderPill icon={<Sun className="h-3.5 w-3.5 text-[#b9f34b]" />}>
              {meta.sessionName}
            </HeaderPill>
            {meta.tournamentName && (
              <HeaderPill icon={<Trophy className="h-3.5 w-3.5 text-[#f5b53c]" />}>
                {meta.tournamentName}
              </HeaderPill>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2 text-[13px] text-white/45 md:inline-flex">
            {VIEW_LABELS[meta.view]}
            <Rss
              className="h-4 w-4 animate-sked-pulse text-[#b9f34b]"
              aria-label="Live"
            />
          </span>

          <LiveClock />
        </div>
      </header>

      {/* ── Main Grid ── */}
      <div
        className={cn(
          "grid flex-1 items-start gap-4 px-4 pb-4 sm:gap-5 sm:px-6 sm:pb-5",
          gridClass,
        )}
      >
        {VIEW_SLOTS[meta.view].map((slot) => (
          <Panel key={slot} className="h-full">
            {slot === "courts"
              ? courtsPanel
              : slot === "queue"
                ? queuePanel
                : tournamentPanel}
          </Panel>
        ))}
      </div>

      {/* ── Sponsor bar ── */}
      {sponsors && sponsors.length > 0 && (
        <BoardSponsorBar sponsors={sponsors} />
      )}

      {/* ── Auto-hide Footer ── */}
      {footer && (
        <AutoHideFooter>
          <div className="border-t border-white/[0.08] px-4 py-2 sm:px-6 sm:py-3">
            {footer}
          </div>
        </AutoHideFooter>
      )}
      </div>
    </div>
  );
}
