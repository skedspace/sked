/* ── Mosaic Layout Types & Presets ── */

export type PanelType =
  | "courts"
  | "queue"
  | "tournament-info"
  | "tournament-bracket";

export interface LayoutPanel {
  type: PanelType;
  colSpan?: number;
  rowSpan?: number;
}

export interface MosaicLayoutDef {
  id: string;
  name: string;
  description: string;
  columns: number;
  panels: LayoutPanel[];
}

/* ── Panel display metadata ── */

export const PANEL_LABELS: Record<PanelType, string> = {
  courts: "Active Courts",
  queue: "Upcoming Groups",
  "tournament-info": "Tournament Info",
  "tournament-bracket": "Tournament Bracket",
};

export const PANEL_DESCRIPTIONS: Record<PanelType, string> = {
  courts: "Live court cards with scores and timers",
  queue: "Waiting groups, on-deck, and returned players",
  "tournament-info": "Tournament overview, stats, and match progress",
  "tournament-bracket": "Single-elimination bracket visualization",
};

export const PANEL_ICONS: Record<PanelType, string> = {
  courts: "🎾",
  queue: "📋",
  "tournament-info": "🏆",
  "tournament-bracket": "🔀",
};

/* ── Preset Layouts ── */

export const PRESET_LAYOUTS: MosaicLayoutDef[] = [
  {
    id: "courts-queue",
    name: "Courts + Queue",
    description: "Active courts on the left, upcoming queue on the right. Best for the main lobby TV.",
    columns: 2,
    panels: [{ type: "courts" }, { type: "queue" }],
  },
  {
    id: "courts-tournament",
    name: "Courts + Tournament",
    description: "Courts beside a full tournament bracket. Great during tournament days.",
    columns: 2,
    panels: [{ type: "courts" }, { type: "tournament-bracket" }],
  },
  {
    id: "triple",
    name: "Triple View",
    description: "Courts, queue, and tournament info in three columns. Maximum information density.",
    columns: 3,
    panels: [
      { type: "courts", colSpan: 1 },
      { type: "queue", colSpan: 1 },
      { type: "tournament-info", colSpan: 1 },
    ],
  },
  {
    id: "queue-tournament",
    name: "Queue + Tournament",
    description: "Queue on the left, tournament bracket on the right. Show players what's coming up.",
    columns: 2,
    panels: [{ type: "queue" }, { type: "tournament-bracket" }],
  },
  {
    id: "full-courts",
    name: "Full Courts",
    description: "Active courts across the entire screen. Maximum visibility for court scheduling.",
    columns: 1,
    panels: [{ type: "courts" }],
  },
  {
    id: "full-bracket",
    name: "Full Bracket",
    description: "Tournament bracket taking the full screen. Perfect for a dedicated bracket TV.",
    columns: 1,
    panels: [{ type: "tournament-bracket" }],
  },
  {
    id: "quad",
    name: "Quad View",
    description: "Four-panel layout showing everything at once. Courts, queue, tournament info, and bracket.",
    columns: 2,
    panels: [
      { type: "courts", colSpan: 1, rowSpan: 1 },
      { type: "queue", colSpan: 1, rowSpan: 1 },
      { type: "tournament-info", colSpan: 1, rowSpan: 1 },
      { type: "tournament-bracket", colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    id: "courts-queue-info",
    name: "Courts + Queue + Info",
    description: "Courts on the left, queue and tournament info stacked on the right.",
    columns: 2,
    panels: [
      { type: "courts", colSpan: 1, rowSpan: 2 },
      { type: "queue", colSpan: 1, rowSpan: 1 },
      { type: "tournament-info", colSpan: 1, rowSpan: 1 },
    ],
  },
];

/* ── Lookup helpers ── */

export function getLayoutById(id: string): MosaicLayoutDef | undefined {
  // Allow short aliases: "triple" → full match, "full-courts" → full match
  return PRESET_LAYOUTS.find((l) => l.id === id);
}

export function getAllLayouts(): MosaicLayoutDef[] {
  return PRESET_LAYOUTS;
}
