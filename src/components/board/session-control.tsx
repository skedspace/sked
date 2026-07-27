"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  StopCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type SponsorItem } from "@/components/board/sponsor-marquee";

/* ══════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════ */

type Player = { id: string; name: string; rating?: string };
type GroupStatus = "waiting" | "on-deck" | "playing";
type CourtStatus = "empty" | "ready" | "active";

type GameGroup = {
  id: string;
  label: string;
  players: Player[];
  status: GroupStatus;
};

type CourtGame = {
  courtId: string;
  courtName: string;
  status: CourtStatus;
  group: GameGroup | null;
  startedAt: string | null;  // ISO string when timer started
  durationMinutes: number;
  elapsedSeconds: number;    // live counter
  isPaused: boolean;
};

type SessionState = {
  queue: Player[];
  groups: GameGroup[];
  courts: CourtGame[];
  returned: Player[];
};

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */

let _id = 100;
function uid() {
  return `id-${++_id}`;
}

const RATING_OPTIONS = ["2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════════
   SESSION CONTROL COMPONENT
   ══════════════════════════════════════════════════ */

export function SessionControl({ orgId: _orgId }: { orgId?: string } = {}) {
  const [state, setState] = useState<SessionState>({
    queue: [
      { id: "p1", name: "Marco Santos", rating: "4.0" },
      { id: "p2", name: "Jenny Lim", rating: "3.5" },
      { id: "p3", name: "Rico Dizon", rating: "4.0" },
      { id: "p4", name: "Anna Cruz", rating: "3.5" },
      { id: "p5", name: "Kyle Tan", rating: "3.0" },
      { id: "p6", name: "Mia Reyes", rating: "3.0" },
    ],
    groups: [
      {
        id: "g1", label: "Next Up",
        players: [
          { id: "p7", name: "Cathy del Rosario", rating: "3.5" },
          { id: "p8", name: "Mark Co", rating: "3.0" },
          { id: "p9", name: "Luna Fernandez", rating: "3.5" },
          { id: "p10", name: "Jared Sison", rating: "3.0" },
        ],
        status: "waiting",
      },
    ],
    courts: [
      {
        courtId: "c1", courtName: "Court 1", status: "active",
        group: {
          id: "g-active-1", label: "Game",
          players: [
            { id: "p11", name: "Tom Aquino", rating: "4.5" },
            { id: "p12", name: "Paolo Guerrero", rating: "4.5" },
            { id: "p13", name: "James Yu", rating: "4.0" },
            { id: "p14", name: "Ben Mercado", rating: "4.5" },
          ],
          status: "playing",
        },
        startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        durationMinutes: 15,
        elapsedSeconds: 8 * 60,
        isPaused: false,
      },
      { courtId: "c2", courtName: "Court 2", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c3", courtName: "Court 3", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c4", courtName: "Court 4", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
    ],
    returned: [
      { id: "p15", name: "Rico Dizon" },
      { id: "p16", name: "Sara Villanueva" },
    ],
  });

  const [playerInput, setPlayerInput] = useState("");
  const [playerRating, setPlayerRating] = useState("3.0");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // ── Sponsor management ──

  const DEFAULT_SPONSORS: SponsorItem[] = [
    { id: "s1", type: "text", content: "🥇 Presented by Pickleball Paradise" },
    { id: "s2", type: "text", content: "🏆 Official Sponsor: SportsTech Pro" },
  ];

  const [sponsors, setSponsors] = useState<SponsorItem[]>(DEFAULT_SPONSORS);

  // Load from localStorage on mount (client-only) to avoid hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sked_board_sponsors");
      if (saved) {
        setSponsors(JSON.parse(saved) as SponsorItem[]);
      }
    } catch { /* ignore */ }
  }, []);

  const [sponsorInput, setSponsorInput] = useState("");
  const [sponsorType, setSponsorType] = useState<"text" | "logo">("text");
  const [sponsorUrl, setSponsorUrl] = useState("");
  const [showSponsorPanel, setShowSponsorPanel] = useState(false);

  const addSponsor = () => {
    if (!sponsorInput.trim()) return;
    const newSponsor: SponsorItem = {
      id: `s-${Date.now()}`,
      type: sponsorType,
      content: sponsorInput.trim(),
      url: sponsorUrl.trim() || undefined,
    };
    const updated = [...sponsors, newSponsor];
    setSponsors(updated);
    localStorage.setItem("sked_board_sponsors", JSON.stringify(updated));
    setSponsorInput("");
    setSponsorUrl("");
  };

  const removeSponsor = (id: string) => {
    const updated = sponsors.filter((s) => s.id !== id);
    setSponsors(updated);
    localStorage.setItem("sked_board_sponsors", JSON.stringify(updated));
  };

  // ── Timer tick ──

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const newCourts = prev.courts.map((c) => {
          if (c.status !== "active" || c.isPaused || !c.startedAt) return c;
          const elapsed = Math.floor((now - new Date(c.startedAt).getTime()) / 1000);
          return { ...c, elapsedSeconds: elapsed };
        });
        return { ...prev, courts: newCourts };
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Queue helpers ──

  const addPlayer = useCallback((name: string, rating?: string) => {
    if (!name.trim()) return;
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, { id: uid(), name: name.trim(), rating }],
    }));
  }, []);

  const handleAddPlayer = (e: FormEvent) => {
    e.preventDefault();
    addPlayer(playerInput, playerRating);
    setPlayerInput("");
  };

  const handlePasteImport = () => {
    const names = pasteText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    names.forEach((name) => addPlayer(name, playerRating));
    setPasteText("");
    setShowPaste(false);
  };

  const removeFromQueue = (id: string) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.filter((p) => p.id !== id),
    }));
  };

  // ── Auto Fill groups ──

  const autoFillGroups = useCallback(() => {
    setState((prev) => {
      const waiting = [...prev.queue];
      if (waiting.length < 4) return prev;

      // Sort by rating (highest first), then pair
      const sorted = waiting.sort((a, b) => {
        const ra = parseFloat(a.rating ?? "0");
        const rb = parseFloat(b.rating ?? "0");
        return rb - ra;
      });

      // Take top 4 to make one group, pairing 1st+4th and 2nd+3rd for balanced teams
      const groupPlayers = sorted.splice(0, 4);

      const newGroup: GameGroup = {
        id: uid(),
        label: `Group ${prev.groups.length + 1}`,
        players: groupPlayers,
        status: "waiting",
      };

      return {
        ...prev,
        queue: sorted,
        groups: [...prev.groups, newGroup],
      };
    });
  }, []);

  // ── Assign group to court ──

  const assignToCourt = (groupId: string, courtId: string) => {
    setState((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group) return prev;
      const court = prev.courts.find((c) => c.courtId === courtId);
      if (!court || court.status !== "empty") return prev;

      return {
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
        courts: prev.courts.map((c) =>
          c.courtId === courtId
            ? {
                ...c,
                status: "ready" as const,
                group: { ...group, status: "on-deck" as GroupStatus },
              }
            : c,
        ),
      };
    });
  };

  // ── Start game ──

  const startGame = (courtId: string) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.courtId === courtId && c.status === "ready"
          ? {
              ...c,
              status: "active" as const,
              startedAt: new Date().toISOString(),
              elapsedSeconds: 0,
              isPaused: false,
            }
          : c,
      ),
    }));
  };

  // ── Toggle pause ──

  const togglePause = (courtId: string) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.courtId === courtId && c.status === "active"
          ? { ...c, isPaused: !c.isPaused }
          : c,
      ),
    }));
  };

  // ── Reset timer ──

  const resetTimer = (courtId: string) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.courtId === courtId
          ? { ...c, startedAt: null, elapsedSeconds: 0, isPaused: false, status: "ready" as const }
          : c,
      ),
    }));
  };

  // ── End game → return players ──

  const endGame = (courtId: string) => {
    setState((prev) => {
      const court = prev.courts.find((c) => c.courtId === courtId);
      if (!court || !court.group) return prev;

      return {
        ...prev,
        courts: prev.courts.map((c) =>
          c.courtId === courtId
            ? { ...c, status: "empty" as const, group: null,
               startedAt: null, elapsedSeconds: 0, isPaused: false }
            : c,
        ),
        returned: [...prev.returned, ...court.group.players],
      };
    });
  };

  // ── Return players to queue ──

  const returnToQueue = (playerId: string) => {
    setState((prev) => {
      const player = prev.returned.find((p) => p.id === playerId);
      if (!player) return prev;
      return {
        ...prev,
        queue: [...prev.queue, player],
        returned: prev.returned.filter((p) => p.id !== playerId),
      };
    });
  };

  const returnAllToQueue = () => {
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, ...prev.returned],
      returned: [],
    }));
  };

  // ── Derived ──

  const availableCourts = state.courts.filter((c) => c.status === "empty");
  const activeCount = state.courts.filter((c) => c.status === "active").length;
  const readyCount = state.courts.filter((c) => c.status === "ready").length;

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */

  return (
    <div className="flex h-full flex-col gap-6">
      {/* ── Session header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#151713]">
            Session Control
          </h1>
          <p className="mt-0.5 text-sm text-[#5d615b]">
            {format(new Date(), "EEEE, MMM d, yyyy")} · Morning Open Play
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-[#eff9d8] px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#367b20]" />
            <span className="text-xs font-semibold text-[#367b20]">Live</span>
          </div>
          <span className="text-xs font-medium text-[#8a8f89]">
            {activeCount} active · {readyCount} ready
          </span>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_2fr]">
        {/* ══════════════════ LEFT: QUEUE ══════════════════ */}
        <div className="space-y-5">
          {/* ── Add Player ── */}
          <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#65ad00]" />
              <span className="text-sm font-bold text-[#151713]">Add Players</span>
            </div>

            <form onSubmit={handleAddPlayer} className="mb-2 flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Player name…"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <select
                value={playerRating}
                onChange={(e) => setPlayerRating(e.target.value)}
                className="h-9 rounded-lg border border-black/[0.07] bg-white px-2 text-xs font-medium text-[#5d615b] outline-none focus:ring-2 focus:ring-[#65ad00]"
              >
                {RATING_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Button type="submit" size="sm" className="h-9">
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {!showPaste ? (
              <button
                type="button"
                onClick={() => setShowPaste(true)}
                className="text-xs font-medium text-[#65ad00] hover:underline"
              >
                Paste a list of names instead
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  placeholder="Paste names separated by commas or new lines…"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-black/[0.07] bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-[#65ad00]"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handlePasteImport}>
                    Import
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPaste(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Queue List ── */}
          <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
              <span className="text-sm font-bold text-[#151713]">
                Queue
              </span>
              <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-xs font-medium text-[#5d615b]">
                {state.queue.length}
              </span>
            </div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto p-2">
              {state.queue.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-[#8a8f89]">
                  No players in queue
                </p>
              ) : (
                state.queue.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#fbfaf7]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#151713] text-[10px] font-bold text-white">
                      {player.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#151713]">
                      {player.name}
                    </span>
                    {player.rating && (
                      <span className="text-xs font-medium text-[#8a8f89]">
                        {player.rating}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromQueue(player.id)}
                      className="rounded-full p-1 text-[#8a8f89] hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Auto Fill ── */}
          <Button
            onClick={autoFillGroups}
            disabled={state.queue.length < 4}
            className="flex w-full items-center justify-center gap-2"
            variant="outline"
          >
            <Users className="h-4 w-4" />
            Auto Fill Groups
            {state.queue.length >= 4 && (
              <span className="rounded-full bg-[#65ad00]/10 px-2 py-0.5 text-xs">
                {Math.floor(state.queue.length / 4)} groups possible
              </span>
            )}
          </Button>

          {/* ── Built Groups ── */}
          {state.groups.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8f89]">
                Groups
              </span>
              {state.groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-black/[0.07] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#151713]">
                      {group.label}
                    </span>
                    <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">
                      {group.status === "on-deck" ? "On Deck" : "Waiting"}
                    </span>
                  </div>
                  <div className="mb-3 space-y-1">
                    {group.players.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="text-[#8a8f89]">{p.name}</span>
                        {p.rating && (
                          <span className="text-xs text-[#b0b4ae]">{p.rating}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {group.status === "waiting" && availableCourts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {availableCourts.map((court) => (
                        <button
                          key={court.courtId}
                          type="button"
                          onClick={() => assignToCourt(group.id, court.courtId)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#eff9d8] px-2.5 py-1 text-xs font-medium text-[#367b20] transition-colors hover:bg-[#e2f5c4]"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {court.courtName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Returned Players ── */}
          {state.returned.length > 0 && (
            <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#151713]">
                  Returned
                </span>
                <button
                  type="button"
                  onClick={returnAllToQueue}
                  className="text-xs font-medium text-[#65ad00] hover:underline"
                >
                  Return all to queue
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.returned.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => returnToQueue(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f3ef] px-3 py-1.5 text-sm text-[#5d615b] transition-colors hover:bg-[#e8e8e4]"
                  >
                    <RotateCcw className="h-3 w-3 text-[#65ad00]" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════ RIGHT: COURTS ══════════════════ */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#151713]">Courts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {state.courts.map((court) => (
              <CourtControlPanel
                key={court.courtId}
                court={court}
                onStartGame={startGame}
                onTogglePause={togglePause}
                onResetTimer={resetTimer}
                onEndGame={endGame}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ SPONSOR MANAGEMENT ══════════════════ */}
      <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={() => setShowSponsorPanel(!showSponsorPanel)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#151713]">Board Sponsors</span>
            <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">
              {sponsors.length}
            </span>
          </div>
          <svg
            className={`h-4 w-4 text-[#8a8f89] transition-transform ${showSponsorPanel ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSponsorPanel && (
          <div className="border-t border-black/[0.07] px-4 pb-4 pt-3 space-y-4">
            {/* Add sponsor form */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[160px]">
                <input
                  type="text"
                  placeholder="Sponsor name or logo URL…"
                  value={sponsorInput}
                  onChange={(e) => setSponsorInput(e.target.value)}
                  className="w-full h-9 rounded-lg border border-black/[0.07] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#65ad00]"
                />
              </div>
              <select
                value={sponsorType}
                onChange={(e) => setSponsorType(e.target.value as "text" | "logo")}
                className="h-9 rounded-lg border border-black/[0.07] bg-white px-2 text-xs font-medium text-[#5d615b] outline-none focus:ring-2 focus:ring-[#65ad00]"
              >
                <option value="text">Text</option>
                <option value="logo">Image URL</option>
              </select>
              <input
                type="text"
                placeholder="Optional link URL…"
                value={sponsorUrl}
                onChange={(e) => setSponsorUrl(e.target.value)}
                className="h-9 min-w-[140px] flex-1 rounded-lg border border-black/[0.07] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#65ad00]"
              />
              <button
                type="button"
                onClick={addSponsor}
                disabled={!sponsorInput.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#151713] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2a2d28] disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Hint about image URLs */}
            {sponsorType === "logo" && (
              <p className="text-xs text-[#8a8f89]">
                Paste a direct image URL (e.g., https://example.com/logo.png). Images appear inverted on the dark board.
              </p>
            )}

            {/* Sponsor list */}
            {sponsors.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#8a8f89]">No sponsors yet. Add one above.</p>
            ) : (
              <div className="space-y-1.5">
                {sponsors.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#fbfaf7]"
                  >
                    {s.type === "logo" ? (
                      <span className="text-xs font-medium text-[#65ad00]">🖼</span>
                    ) : (
                      <span className="text-xs font-medium text-[#65ad00]">Aa</span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-[#151713]">
                      {s.content}
                    </span>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#65ad00] hover:underline"
                      >
                        link
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSponsor(s.id)}
                      className="rounded-full p-1 text-[#8a8f89] hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   COURT CONTROL PANEL
   ══════════════════════════════════════════════════ */

interface CourtControlProps {
  court: CourtGame;
  onStartGame: (courtId: string) => void;
  onTogglePause: (courtId: string) => void;
  onResetTimer: (courtId: string) => void;
  onEndGame: (courtId: string) => void;
}

function CourtControlPanel({
  court,
  onStartGame,
  onTogglePause,
  onResetTimer,
  onEndGame,
}: CourtControlProps) {
  const isActive = court.status === "active";
  const isReady = court.status === "ready";
  const isEmpty = court.status === "empty";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        isActive && "border-l-4 border-l-[#b9f34b]",
        isReady && "border-l-4 border-l-[#5b8def]",
        isEmpty && "border-black/[0.07]",
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-[#151713]">
            {court.courtName}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-[#eff9d8] px-2 py-0.5 text-[10px] font-semibold text-[#367b20]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#367b20]" />
              Live
            </span>
          )}
          {isReady && (
            <span className="rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[10px] font-semibold text-[#2764ad]">
              Ready
            </span>
          )}
          {isEmpty && (
            <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#8a8f89]">
              Empty
            </span>
          )}
        </div>

        {/* Timer display */}
        {isActive && (
          <div className="flex items-center gap-2">
            <Clock className={cn("h-4 w-4", court.isPaused ? "text-amber-400" : "text-[#65ad00]")} />
            <span className="font-mono text-lg font-bold tabular-nums text-[#151713]">
              {formatElapsed(court.elapsedSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Players (active game) */}
      {isActive && court.group && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {court.group.players.slice(0, 2).map((p) => (
              <span key={p.id} className="text-sm font-medium text-[#151713]">
                {p.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-black/[0.05]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#b0b4ae]">vs</span>
            <div className="h-px flex-1 bg-black/[0.05]" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {court.group.players.slice(2, 4).map((p) => (
              <span key={p.id} className="text-sm font-medium text-[#151713]">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="mb-4 flex h-20 items-center justify-center rounded-lg bg-[#fbfaf7]">
          <p className="text-sm text-[#b0b4ae]">
            Assign a group to start
          </p>
        </div>
      )}

      {/* Ready state (group assigned, waiting to start) */}
      {isReady && court.group && (
        <div className="mb-4 space-y-3">
          {court.group.players.slice(0, 2).map((p) => (
            <span key={p.id} className="text-sm text-[#5d615b]">{p.name}</span>
          ))}
          <div className="text-xs text-[#b0b4ae]">vs</div>
          {court.group.players.slice(2, 4).map((p) => (
            <span key={p.id} className="text-sm text-[#5d615b]">{p.name}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isReady && (
          <Button
            size="sm"
            onClick={() => onStartGame(court.courtId)}
            className="flex items-center gap-1.5"
          >
            <Play className="h-4 w-4" />
            Start Game
          </Button>
        )}

        {isActive && (
          <>
            <Button
              size="sm"
              variant={court.isPaused ? "default" : "outline"}
              onClick={() => onTogglePause(court.courtId)}
              className="flex items-center gap-1.5"
            >
              {court.isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {court.isPaused ? "Resume" : "Pause"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onResetTimer(court.courtId)}
              className="flex items-center gap-1.5 text-[#5d615b]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onEndGame(court.courtId)}
              className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <StopCircle className="h-4 w-4" />
              End Game
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
