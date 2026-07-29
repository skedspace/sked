import type { CourtData } from "@/components/board/active-courts";
import type { QueueGroup } from "@/components/board/queue-display";
import type { SponsorItem } from "@/components/board/sponsor-marquee";
import type {
  BracketMatchData,
  TournamentData,
} from "@/lib/tournament-actions";

const VERSION = 1;
const PREFIX = "sked_board_cache:";

export type CachedBoardState = {
  version: number;
  savedAt: string;
  orgKey: string;
  orgName: string;
  sessionName: string;
  courts: CourtData[];
  queue: QueueGroup[];
  tournament: TournamentData | null;
  bracket: BracketMatchData[];
  sponsors: SponsorItem[];
  boardTitle?: string;
  tagline?: string;
};

function keyFor(orgKey: string) {
  return `${PREFIX}${orgKey}`;
}

export function loadCachedBoardState(orgKey: string): CachedBoardState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(keyFor(orgKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedBoardState;
    if (parsed.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedBoardState(
  orgKey: string,
  state: Omit<CachedBoardState, "version" | "savedAt" | "orgKey">,
) {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedBoardState = {
      ...state,
      version: VERSION,
      savedAt: new Date().toISOString(),
      orgKey,
    };
    window.localStorage.setItem(keyFor(orgKey), JSON.stringify(payload));
  } catch {
    // A full storage quota should not break the live board.
  }
}

export function formatCachedAt(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
