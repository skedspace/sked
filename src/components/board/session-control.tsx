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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateSession,
  updateSessionState,
  endSession,
  type LiveSessionState,
} from "@/lib/session-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */

let _id = 100;
function uid() {
  return `id-${++_id}`;
}

const RATING_OPTIONS = ["2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

const DURATION_PRESETS = [
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "25 min", value: 25 },
  { label: "30 min", value: 30 },
  { label: "Custom", value: -1 },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

function getProgressPercent(elapsed: number, totalMinutes: number): number {
  if (totalMinutes <= 0) return 0;
  const totalSeconds = totalMinutes * 60;
  return Math.min(100, Math.round((elapsed / totalSeconds) * 100));
}

/* ══════════════════════════════════════════════════
   SESSION CONTROL COMPONENT
   ══════════════════════════════════════════════════ */

export function SessionControl({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("Open Play");
  const [state, setState] = useState<LiveSessionState>({
    queue: [],
    groups: [],
    courts: [
      { courtId: "c1", courtName: "Court 1", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c2", courtName: "Court 2", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c3", courtName: "Court 3", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c4", courtName: "Court 4", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
    ],
    returned: [],
    checkedIn: [],
    checkedInLog: [],
  });

  // ── Load session from DB on mount ──
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const session = await getOrCreateSession(orgId);
      if (session) {
        setSessionId(session.id);
        setSessionName(session.name);
        // Merge loaded state with defaults for any missing courts
        if (session.state && typeof session.state === "object") {
          const loaded = session.state as LiveSessionState;
          // Ensure we always have the 4 default courts even if state is partial
          const defaultCourts = [
            { courtId: "c1", courtName: "Court 1", status: "empty" as const, group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
            { courtId: "c2", courtName: "Court 2", status: "empty" as const, group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
            { courtId: "c3", courtName: "Court 3", status: "empty" as const, group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
            { courtId: "c4", courtName: "Court 4", status: "empty" as const, group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
          ];
          // Merge loaded courts over defaults (keeping loaded state for matching courtIds)
          const mergedCourts = defaultCourts.map((dc) => {
            const loadedCourt = loaded.courts?.find((lc: any) => lc.courtId === dc.courtId);
            return loadedCourt ?? dc;
          });
          setState({
            queue: loaded.queue ?? [],
            groups: loaded.groups ?? [],
            courts: mergedCourts,
            returned: loaded.returned ?? [],
            checkedIn: loaded.checkedIn ?? [],
            checkedInLog: loaded.checkedInLog ?? [],
          });
        }
      }
      // Load players into the queue (merge with existing)
      const db = createClient();
      const { data: players } = await db
        .from("players")
        .select("id, name, skill_level")
        .eq("org_id", orgId)
        .eq("status", "active")
        .order("name");

      if (players && players.length > 0) {
        setState((prev) => {
          const existingIds = new Set(prev.queue.map((p) => p.id));
          const newPlayers = players
            .filter((p: any) => !existingIds.has(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              rating: p.skill_level ? String(p.skill_level) : undefined,
            }));
          if (newPlayers.length === 0) return prev;
          return {
            ...prev,
            queue: [...prev.queue, ...newPlayers],
          };
        });
      }

      setLoading(false);
    };

    init();
  }, [orgId]);

  // ── Debounced state persistence ──
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistState = useCallback((newState: LiveSessionState) => {
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(async () => {
      if (sessionId) {
        await updateSessionState(sessionId, newState);
      }
    }, 500); // debounce 500ms
  }, [sessionId]);

  // Helper to update state and trigger persistence
  const updateAndPersist = useCallback((updater: (prev: LiveSessionState) => LiveSessionState) => {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, [persistState]);

  // Cleanup persist timer on unmount
  useEffect(() => {
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, []);

  const [playerInput, setPlayerInput] = useState("");
  const [playerRating, setPlayerRating] = useState("3.0");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // ── Check-in ──

  const [checkInQuery, setCheckInQuery] = useState("");
  const [allPlayers, setAllPlayers] = useState<Array<{ id: string; name: string; skill_level: number | null }>>([]);

  // Load all active players for check-in
  useEffect(() => {
    if (!orgId) return;
    const db = createClient();
    db.from("players")
      .select("id, name, skill_level")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("name")
      .then(({ data }: { data: unknown }) => {
        if (data) setAllPlayers(data as any);
      })
      .catch(() => {});
  }, [orgId]);

  const checkedInIds = new Set(state.checkedIn.map((p) => p.id));
  const queueIds = new Set(state.queue.map((p) => p.id));
  const returnedIds = new Set(state.returned.map((p) => p.id));
  const onSiteIds = new Set([...checkedInIds, ...queueIds, ...returnedIds]);

  const filteredForCheckIn = allPlayers.filter(
    (p) => !onSiteIds.has(p.id) && p.name.toLowerCase().includes(checkInQuery.toLowerCase()),
  );

  const checkInPlayer = useCallback((player: { id: string; name: string; skill_level: number | null }) => {
    const sessionPlayer: Player = {
      id: player.id,
      name: player.name,
      rating: player.skill_level ? String(player.skill_level) : undefined,
    };
    updateAndPersist((prev) => ({
      ...prev,
      checkedIn: [...prev.checkedIn, sessionPlayer],
      queue: [...prev.queue, sessionPlayer],
      checkedInLog: [
        ...prev.checkedInLog,
        { playerId: player.id, playerName: player.name, checkedInAt: new Date().toISOString() },
      ],
    }));
    setCheckInQuery("");
  }, [updateAndPersist]);

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

  const addPlayer = useCallback(async (name: string, rating?: string, email?: string, phone?: string) => {
    if (!name.trim()) return null;
    const db = createClient();
    // Persist to the players table
    const { data: newPlayer, error } = await db
      .from("players")
      .insert({
        org_id: orgId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        skill_level: rating ? parseFloat(rating) : 2.0,
        play_style: "All Court Player",
        status: "active",
      })
      .select("id, name, skill_level")
      .single();

    if (error || !newPlayer) return null;

    const player = {
      id: newPlayer.id,
      name: newPlayer.name,
      rating: newPlayer.skill_level ? String(newPlayer.skill_level) : rating,
    };

    updateAndPersist((prev) => ({
      ...prev,
      queue: [...prev.queue, player],
    }));
    return player;
  }, [orgId, updateAndPersist]);

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    await addPlayer(playerInput, playerRating);
    setPlayerInput("");
  };

  const handlePasteImport = async () => {
    const names = pasteText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      await addPlayer(name, playerRating);
    }
    setPasteText("");
    setShowPaste(false);
  };

  const removeFromQueue = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      queue: prev.queue.filter((p) => p.id !== id),
    }));
  };

  // ── Manual Group Builder ──

  const [selectMode, setSelectMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  const togglePlayerSelect = (id: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const createManualGroup = () => {
    if (selectedPlayers.size !== 4) return;
    updateAndPersist((prev) => {
      const selected = prev.queue.filter((p) => selectedPlayers.has(p.id));
      if (selected.length !== 4) return prev;
      const newGroup: GameGroup = {
        id: uid(),
        label: `Group ${prev.groups.length + 1}`,
        players: selected,
        status: "waiting",
      };
      return {
        ...prev,
        queue: prev.queue.filter((p) => !selectedPlayers.has(p.id)),
        groups: [...prev.groups, newGroup],
      };
    });
    setSelectedPlayers(new Set());
    setSelectMode(false);
  };

  const cancelManualGroup = () => {
    setSelectedPlayers(new Set());
    setSelectMode(false);
  };

  // ── Auto Fill groups ──

  const autoFillGroups = useCallback(() => {
    updateAndPersist((prev) => {
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
  }, [updateAndPersist]);

  // ── Assign group to court ──

  const assignToCourt = (groupId: string, courtId: string) => {
    updateAndPersist((prev) => {
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
    updateAndPersist((prev) => ({
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
    updateAndPersist((prev) => ({
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
    updateAndPersist((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.courtId === courtId
          ? { ...c, startedAt: null, elapsedSeconds: 0, isPaused: false, status: "ready" as const }
          : c,
      ),
    }));
  };

  // ── End game → show score dialog ──

  const [endGameTarget, setEndGameTarget] = useState<CourtGame | null>(null);
  const [teamAScore, setTeamAScore] = useState("");
  const [teamBScore, setTeamBScore] = useState("");
  const [recordingMatch, setRecordingMatch] = useState(false);
  // ── Swap teams in score dialog ──
  const [swapTeamsFlag, setSwapTeamsFlag] = useState(false);

  const confirmEndGame = useCallback(async () => {
    if (!endGameTarget || !endGameTarget.group) return;
    setRecordingMatch(true);

    const court = endGameTarget;
    const group = court.group;
    if (!group) return;
    const teamA = (swapTeamsFlag ? group.players.slice(2, 4) : group.players.slice(0, 2));
    const teamB = (swapTeamsFlag ? group.players.slice(0, 2) : group.players.slice(2, 4));
    const scoreStr =
      teamAScore.trim() || teamBScore.trim()
        ? `${teamAScore.trim() || "0"} - ${teamBScore.trim() || "0"}`
        : null;

    try {
      // Auto-create a match record
      const db = createClient();
      await db.from("matches").insert({
        org_id: orgId,
        resource_id: null,
        title: `${court.courtName} — ${sessionName}`,
        team_a: teamA.map((p) => p.name).join(" / "),
        team_b: teamB.map((p) => p.name).join(" / "),
        match_type: "Doubles",
        starts_at: court.startedAt ?? new Date().toISOString(),
        ends_at: new Date().toISOString(),
        status: "completed",
        score: scoreStr,
        participant_count: group.players.length,
        participant_capacity: 4,
        notes: null,
      });
    } catch {
      // Match recording is best-effort — don't block the game end
    }

    setRecordingMatch(false);
    setEndGameTarget(null);
    setTeamAScore("");
    setTeamBScore("");

    // End the game on the court
    updateAndPersist((prev) => {
      const currentCourt = prev.courts.find((c) => c.courtId === court.courtId);
      if (!currentCourt || !currentCourt.group) return prev;

      return {
        ...prev,
        courts: prev.courts.map((c) =>
          c.courtId === court.courtId
            ? { ...c, status: "empty" as const, group: null,
               startedAt: null, elapsedSeconds: 0, isPaused: false }
            : c,
        ),
        returned: [...prev.returned, ...currentCourt.group.players],
      };
    });
  }, [endGameTarget, teamAScore, teamBScore, swapTeamsFlag, orgId, sessionName, updateAndPersist]);

  const requestEndGame = useCallback((courtId: string) => {
    setState((prev) => {
      const court = prev.courts.find((c) => c.courtId === courtId);
      if (!court || !court.group) return prev;
      setEndGameTarget(court);
      setTeamAScore("");
      setTeamBScore("");
      return prev;
    });
  }, []);

  const swapTeams = useCallback(() => {
    setSwapTeamsFlag((prev) => !prev);
  }, []);

  // ── Return players to queue ──

  const returnToQueue = (playerId: string) => {
    updateAndPersist((prev) => {
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
    updateAndPersist((prev) => ({
      ...prev,
      queue: [...prev.queue, ...prev.returned],
      returned: [],
    }));
  };

  // ── Court duration control ──

  const changeCourtDuration = useCallback((courtId: string, minutes: number) => {
    updateAndPersist((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.courtId === courtId ? { ...c, durationMinutes: minutes } : c,
      ),
    }));
  }, [updateAndPersist]);

  // ── Match history ──

  const [matchHistory, setMatchHistory] = useState<Array<{ id: string; title: string; team_a: string; team_b: string; score: string | null; ends_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const db = createClient();
    db.from("matches")
      .select("id, title, team_a, team_b, score, ends_at")
      .eq("org_id", orgId)
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(10)
      .then(({ data }: { data: unknown }) => {
        if (data) setMatchHistory(data as any);
      })
      .catch(() => {});
  }, [orgId]);

  // ── Session Templates ──

  const TEMPLATE_KEY = "sked_session_templates";
  const BUILTIN_TEMPLATES = [
    { name: "Morning Open Play", courts: 4, duration: 15 },
    { name: "Evening League", courts: 4, duration: 25 },
    { name: "Weekend Juniors", courts: 2, duration: 20 },
  ];

  const [savedTemplates, setSavedTemplates] = useState<Array<{ name: string; courts: number; duration: number }>>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_KEY);
      if (saved) setSavedTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const applyTemplate = useCallback((courts: number, duration: number) => {
    updateAndPersist((prev) => ({
      ...prev,
      courts: prev.courts.slice(0, courts).map((c, i) => ({
        ...c,
        courtName: `Court ${i + 1}`,
        durationMinutes: duration,
        status: "empty" as const,
        group: null,
        startedAt: null,
        elapsedSeconds: 0,
        isPaused: false,
      })),
    }));
    setShowTemplates(false);
  }, [updateAndPersist]);

  const saveCurrentAsTemplate = () => {
    if (!templateName.trim()) return;
    const tmpl = { name: templateName.trim(), courts: state.courts.length, duration: state.courts[0]?.durationMinutes ?? 15 };
    const updated = [...savedTemplates, tmpl];
    setSavedTemplates(updated);
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
    setTemplateName("");
  };

  const deleteTemplate = (index: number) => {
    const updated = savedTemplates.filter((_, i) => i !== index);
    setSavedTemplates(updated);
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
  };

  // ── Derived ──

  const availableCourts = state.courts.filter((c) => c.status === "empty");
  const activeCount = state.courts.filter((c) => c.status === "active").length;
  const readyCount = state.courts.filter((c) => c.status === "ready").length;

  // Session elapsed time (earliest startedAt among active courts)
  const sessionStart = state.courts.reduce<string | null>((earliest, c) => {
    if (c.startedAt && (!earliest || c.startedAt < earliest)) return c.startedAt;
    return earliest;
  }, null);
  const sessionElapsed = sessionStart
    ? Math.floor((Date.now() - new Date(sessionStart).getTime()) / 1000)
    : 0;

  // Estimated wait time per player (in minutes)
  const avgGameMinutes = state.courts.reduce((sum, c) => sum + c.durationMinutes, 0) / Math.max(1, state.courts.length);
  const busyCourts = state.courts.filter((c) => c.status === "active" || c.status === "ready").length;
  const freeCourts = state.courts.length - busyCourts;
  const groupsAhead = Math.max(0, state.groups.length - freeCourts);
  const estimateMinutes = (playerIndex: number) => {
    const pos = Math.floor(playerIndex / 4);
    return (pos + groupsAhead) * avgGameMinutes;
  };

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */

  // ── Session summary computation ──

  const [showSummary, setShowSummary] = useState(false);

  function computeSummary() {
    const totalGames = matchHistory.length;
    const totalPlaySeconds = matchHistory.reduce((sum, m) => {
      if (!m.ends_at) return sum;
      // Estimate 15 min per match if no start time available
      return sum + 900;
    }, 0);

    // Per-player stats
    const playerStats: Record<string, { games: number; name: string }> = {};
    for (const m of matchHistory) {
      for (const name of [m.team_a, m.team_b]) {
        // Split on " vs " and " / " to extract individual player names
        const individuals = name.split(/ vs | \/ /);
        for (const ind of individuals) {
          const trimmed = ind.trim();
          if (!trimmed) continue;
          if (!playerStats[trimmed]) playerStats[trimmed] = { games: 0, name: trimmed };
          playerStats[trimmed].games++;
        }
      }
    }
    const topPlayers = Object.values(playerStats).sort((a, b) => b.games - a.games).slice(0, 10);

    // Court utilization
    const totalPossibleSeconds = state.courts.length * sessionElapsed;
    const courtUtil = state.courts.map((c) => ({
      name: c.courtName,
      utilizedSeconds: c.elapsedSeconds,
      utilizationPct: totalPossibleSeconds > 0 ? Math.round((c.elapsedSeconds / (sessionElapsed || 1)) * 100) : 0,
    }));

    // Busiest periods — count active courts by time buckets
    const busyBuckets: { label: string; count: number }[] = [];
    if (sessionElapsed > 0) {
      const bucketSize = 300; // 5 min buckets
      const bucketCount = Math.max(1, Math.ceil(sessionElapsed / bucketSize));
      for (let i = 0; i < bucketCount; i++) {
        const bucketStart = i * bucketSize;
        const bucketEnd = Math.min((i + 1) * bucketSize, sessionElapsed);
        const minsFromStart = Math.floor(bucketStart / 60);
        const label = `${minsFromStart}-${minsFromStart + 5}m`;
        // Count how many courts were active during this bucket by checking if their elapsed overlaps
        const activeInBucket = state.courts.filter((c) => {
          if (!c.startedAt) return false;
          const courtStart = Math.max(0, 0); // relative to session start
          const courtElapsed = c.elapsedSeconds;
          return courtElapsed > bucketStart && courtElapsed < bucketEnd;
        }).length;
        busyBuckets.push({ label, count: activeInBucket });
      }
    }

    // Win/loss per player from scores
    const winLoss: Record<string, { wins: number; losses: number; name: string }> = {};
    const matchResults = matchHistory.map((m) => {
      const scoreA = m.score ? parseInt(m.score.split("-")[0]?.trim() || "0", 10) : null;
      const scoreB = m.score ? parseInt(m.score.split("-")[1]?.trim() || "0", 10) : null;
      const teamAPlayers = m.team_a.split(/ vs | \/ |, /).map((s) => s.trim()).filter(Boolean);
      const teamBPlayers = m.team_b.split(/ vs | \/ |, /).map((s) => s.trim()).filter(Boolean);
      let winner: "A" | "B" | "draw" | null = null;
      if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
        winner = scoreA > scoreB ? "A" : "B";
      }
      // Track wins/losses
      for (const p of teamAPlayers) {
        if (!winLoss[p]) winLoss[p] = { wins: 0, losses: 0, name: p };
        if (winner === "A") winLoss[p].wins++;
        else if (winner === "B") winLoss[p].losses++;
      }
      for (const p of teamBPlayers) {
        if (!winLoss[p]) winLoss[p] = { wins: 0, losses: 0, name: p };
        if (winner === "B") winLoss[p].wins++;
        else if (winner === "A") winLoss[p].losses++;
      }
      return { teamAPlayers, teamBPlayers, score: m.score, winner, title: m.title };
    });

    const leaderboard = Object.values(winLoss)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .slice(0, 10);

    const avgGameMinutes = totalGames > 0 ? Math.round((sessionElapsed / totalGames) / 60) : 0;
    const uniquePlayerCount = Object.keys(playerStats).length;
    const playersPerHour = sessionElapsed > 0 ? Math.round((Object.keys(winLoss).length || uniquePlayerCount) / (sessionElapsed / 3600)) : 0;
    const avgCourtUtil = courtUtil.length > 0 ? Math.round(courtUtil.reduce((s, c) => s + c.utilizationPct, 0) / courtUtil.length) : 0;

    return {
      totalGames,
      totalPlaySeconds,
      topPlayers,
      courtUtil,
      busyBuckets,
      uniquePlayers: Object.keys(playerStats).length,
      leaderboard,
      matchResults,
      avgGameMinutes,
      playersPerHour,
      avgCourtUtil,
      checkedInTotal: state.checkedInLog.length,
    };
  }

  const summary = showSummary ? computeSummary() : null;

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
          {sessionElapsed > 0 && (
            <span className="hidden text-xs font-medium text-[#8a8f89] sm:inline">
              Session {formatElapsed(sessionElapsed)}
            </span>
          )}
          <span className="text-xs font-medium text-[#8a8f89]">
            {activeCount} active · {readyCount} ready
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-1 rounded-lg border border-black/[0.07] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#626860] transition-colors hover:bg-[#f3f3ef]"
            >
              Templates
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-black/[0.07] bg-white p-3 shadow-lg">
                <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[#626860]">Built-in</span>
                <div className="mt-2 space-y-1">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => applyTemplate(t.courts, t.duration)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-[#151713] transition-colors hover:bg-[#f3f3ef]"
                    >
                      <span>{t.name}</span>
                      <span className="text-xs text-[#8a8f89]">{t.courts}c · {t.duration}m</span>
                    </button>
                  ))}
                </div>
                {savedTemplates.length > 0 && (
                  <>
                    <div className="mt-3 h-px bg-black/[0.06]" />
                    <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.06em] text-[#626860]">Saved</span>
                    <div className="mt-2 space-y-1">
                      {savedTemplates.map((t, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2">
                          <button
                            type="button"
                            onClick={() => applyTemplate(t.courts, t.duration)}
                            className="flex-1 text-left text-sm font-medium text-[#151713] hover:text-[#65ad00]"
                          >
                            <span>{t.name}</span>
                            <span className="ml-2 text-xs text-[#8a8f89]">{t.courts}c · {t.duration}m</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTemplate(i)}
                            className="rounded-full p-1 text-[#8a8f89] hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="mt-3 h-px bg-black/[0.06]" />
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Save current as…"
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={saveCurrentAsTemplate}
                    disabled={!templateName.trim()}
                    className="shrink-0"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <StopCircle className="h-4 w-4" />
            End Session
          </Button>
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

          {/* ── Check In ── */}
          <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#151713]">Check In</span>
                <span className="rounded-full bg-[#eff9d8] px-2 py-0.5 text-[10px] font-semibold text-[#367b20]">
                  {state.checkedIn.length} on-site
                </span>
              </div>
            </div>
            <div className="relative">
              <Input
                value={checkInQuery}
                onChange={(e) => setCheckInQuery(e.target.value)}
                placeholder="Search players to check in…"
                className="h-9 text-sm"
              />
              {checkInQuery && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full space-y-0.5 overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-1.5 shadow-lg">
                  {filteredForCheckIn.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#8a8f89]">No players found</p>
                  ) : (
                    filteredForCheckIn.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => checkInPlayer(p)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#151713] transition-colors hover:bg-[#eff9d8]"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#151713] text-[10px] font-bold text-white">
                          {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                        <span className="flex-1">{p.name}</span>
                        {p.skill_level && (
                          <span className="text-xs text-[#8a8f89]">{p.skill_level}</span>
                        )}
                        <span className="rounded bg-[#65ad00]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#367b20]">Check in</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Queue List ── */}
          <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
              <span className="text-sm font-bold text-[#151713]">
                Queue {selectMode ? `(${selectedPlayers.size}/4 selected)` : ""}
              </span>
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelManualGroup}
                      className="text-xs font-medium text-[#626860] hover:underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={createManualGroup}
                      disabled={selectedPlayers.size !== 4}
                      className="rounded-lg bg-[#151713] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2d28] disabled:opacity-40"
                    >
                      Create Group
                    </button>
                  </>
                ) : (
                  <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-xs font-medium text-[#5d615b]">
                    {state.queue.length}
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto p-2">
              {loading ? (
                <p className="px-2 py-4 text-center text-sm text-[#8a8f89]">
                  Loading players…
                </p>
              ) : state.queue.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-[#8a8f89]">
                  No players in queue
                </p>
              ) : (
                state.queue.map((player, idx) => {
                  const waitMin = estimateMinutes(idx);
                  return (
                    <div
                      key={player.id}
                      onClick={() => selectMode ? togglePlayerSelect(player.id) : undefined}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                        selectMode
                          ? selectedPlayers.has(player.id)
                            ? "cursor-pointer bg-[#eff9d8]"
                            : "cursor-pointer hover:bg-[#fbfaf7]"
                          : "hover:bg-[#fbfaf7]"
                      }`}
                    >
                      {selectMode && (
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 text-[10px] font-bold transition-colors ${
                            selectedPlayers.has(player.id)
                              ? "border-[#65ad00] bg-[#65ad00] text-white"
                              : "border-black/[0.15] text-transparent"
                          }`}
                        >
                          {selectedPlayers.has(player.id) ? "✓" : ""}
                        </span>
                      )}
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
                      {!selectMode && waitMin > 0 && (
                        <span className="shrink-0 rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#626860]">
                          ~{waitMin}m
                        </span>
                      )}
                      {!selectMode && (
                        <button
                          type="button"
                          onClick={() => removeFromQueue(player.id)}
                          className="rounded-full p-1 text-[#8a8f89] hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Auto Fill & Manual Select ── */}
          <div className="flex gap-2">
            <Button
              onClick={autoFillGroups}
              disabled={state.queue.length < 4}
              className="flex flex-1 items-center justify-center gap-2"
              variant="outline"
            >
              <Users className="h-4 w-4" />
              Auto Fill
              {state.queue.length >= 4 && (
                <span className="rounded-full bg-[#65ad00]/10 px-2 py-0.5 text-xs">
                  {Math.floor(state.queue.length / 4)}
                </span>
              )}
            </Button>
            <Button
              onClick={() => { setSelectMode(!selectMode); setSelectedPlayers(new Set()); }}
              disabled={state.queue.length < 4}
              className="flex items-center justify-center gap-2"
              variant={selectMode ? "default" : "outline"}
            >
              <Users className="h-4 w-4" />
              Select
            </Button>
          </div>

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

          {/* ── Match History ── */}
          <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#151713]">Match History</span>
                <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">
                  {matchHistory.length}
                </span>
              </div>
              <svg
                className={`h-4 w-4 text-[#8a8f89] transition-transform ${showHistory ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHistory && (
              <div className="border-t border-black/[0.07] px-4 pb-4 pt-3">
                {matchHistory.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[#8a8f89]">No completed matches yet.</p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.map((match) => (
                      <div
                        key={match.id}
                        className="rounded-lg border border-black/[0.05] bg-[#fbfaf7] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#151713]">
                            {match.team_a} vs {match.team_b}
                          </span>
                          {match.score && (
                            <span className="shrink-0 rounded-full bg-[#eff9d8] px-2 py-0.5 text-[11px] font-bold text-[#367b20]">
                              {match.score}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-[#8a8f89]">
                          {match.ends_at ? format(new Date(match.ends_at), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Attendance Log ── */}
          {state.checkedInLog.length > 0 && (
            <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-sm font-bold text-[#151713]">Attendance</span>
                <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">
                  {state.checkedInLog.length}
                </span>
              </div>
              <div className="border-t border-black/[0.07] px-4 pb-3">
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {state.checkedInLog
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((entry) => (
                      <div key={`${entry.playerId}-${entry.checkedInAt}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                        <span className="font-medium text-[#151713]">{entry.playerName}</span>
                        <span className="text-[#8a8f89]">
                          {format(new Date(entry.checkedInAt), "h:mm a")}
                        </span>
                      </div>
                    ))}
                </div>
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
                onEndGame={requestEndGame}
                onChangeDuration={changeCourtDuration}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Score dialog when ending a game */}
      <Dialog open={!!endGameTarget} onOpenChange={(open) => !open && setEndGameTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center pb-3">
            <DialogTitle>Record Match Score</DialogTitle>
          </DialogHeader>

          {endGameTarget?.group && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Team A */}
                <div className="rounded-xl border border-black/[0.08] bg-[#f0f9d9] p-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.06em] text-[#367b20]">Team A</span>
                  <p className="mt-1.5 text-sm font-bold text-[#151713]">
                    {(swapTeamsFlag ? endGameTarget.group.players.slice(2, 4) : endGameTarget.group.players.slice(0, 2)).map((p) => p.name).join(" & ")}
                  </p>
                  <div className="mt-3">
                    <Label className="text-[11px] font-black text-[#367b20]">Score</Label>
                    <div className="mt-1 flex items-center gap-0">
                      <button
                        type="button"
                        onClick={() => setTeamAScore((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                        className="flex h-12 w-10 items-center justify-center rounded-l-xl border border-r-0 border-black/[0.08] bg-white text-[#626860] transition-colors hover:bg-[#f3f3ef] active:bg-[#e8e8e4]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                      </button>
                      <Input
                        value={teamAScore}
                        onChange={(e) => setTeamAScore(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="h-12 rounded-none text-center text-2xl font-black"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={() => setTeamAScore((prev) => String((parseInt(prev, 10) || 0) + 1))}
                        className="flex h-12 w-10 items-center justify-center rounded-r-xl border border-l-0 border-black/[0.08] bg-white text-[#626860] transition-colors hover:bg-[#f3f3ef] active:bg-[#e8e8e4]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team B */}
                <div className="rounded-xl border border-black/[0.08] bg-[#f0f0ee] p-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.06em] text-[#626860]">Team B</span>
                  <p className="mt-1.5 text-sm font-bold text-[#151713]">
                    {(swapTeamsFlag ? endGameTarget.group.players.slice(0, 2) : endGameTarget.group.players.slice(2, 4)).map((p) => p.name).join(" & ")}
                  </p>
                  <div className="mt-3">
                    <Label className="text-[11px] font-black text-[#626860]">Score</Label>
                    <div className="mt-1 flex items-center gap-0">
                      <button
                        type="button"
                        onClick={() => setTeamBScore((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                        className="flex h-12 w-10 items-center justify-center rounded-l-xl border border-r-0 border-black/[0.08] bg-white text-[#626860] transition-colors hover:bg-[#f3f3ef] active:bg-[#e8e8e4]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                      </button>
                      <Input
                        value={teamBScore}
                        onChange={(e) => setTeamBScore(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="h-12 rounded-none text-center text-2xl font-black"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={() => setTeamBScore((prev) => String((parseInt(prev, 10) || 0) + 1))}
                        className="flex h-12 w-10 items-center justify-center rounded-r-xl border border-l-0 border-black/[0.08] bg-white text-[#626860] transition-colors hover:bg-[#f3f3ef] active:bg-[#e8e8e4]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={swapTeams}
                className="mx-auto flex items-center gap-1.5 text-xs font-medium text-[#65ad00] hover:underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                Swap teams
              </button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setEndGameTarget(null); setSwapTeamsFlag(false); }}
                  disabled={recordingMatch}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmEndGame}
                  disabled={recordingMatch}
                >
                  {recordingMatch ? "Recording…" : "Record Match & End"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Summary Dialog — Daily Report */}
      <Dialog open={showSummary} onOpenChange={(open) => !open && setShowSummary(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="items-center pb-1">
            <DialogTitle className="text-xl">🏆 Daily Session Report</DialogTitle>
            <p className="text-xs text-[#626860]">{format(new Date(), "EEEE, MMM d, yyyy")}</p>
          </DialogHeader>

          {summary && (
            <div className="space-y-6">
              {/* ═══ KPI Cards ═══ */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-gradient-to-br from-[#f0f9d9] to-[#e4f5c1] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[#151713]">{summary.totalGames}</span>
                  <span className="text-[10px] font-semibold text-[#4d7a14]">Games Played</span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[#e8f1ff] to-[#d6e6ff] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[#151713]">{summary.uniquePlayers}</span>
                  <span className="text-[10px] font-semibold text-[#2d5a8a]">Players</span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[#fdf3d6] to-[#fcebc2] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[#151713]">{formatElapsed(sessionElapsed)}</span>
                  <span className="text-[10px] font-semibold text-[#8a6d2d]">Active Time</span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[#f3f3ef] to-[#e8e8e4] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[#151713]">{summary.avgCourtUtil}%</span>
                  <span className="text-[10px] font-semibold text-[#626860]">Utilization</span>
                </div>
              </div>

              {/* ═══ Efficiency Metrics ═══ */}
              <div className="flex items-center justify-center gap-6 rounded-xl border border-black/[0.06] bg-[#fbfaf7] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#626860]">Avg game</span>
                  <span className="text-sm font-black text-[#151713]">{summary.avgGameMinutes}m</span>
                </div>
                <div className="h-6 w-px bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#626860]">Players/hr</span>
                  <span className="text-sm font-black text-[#151713]">{summary.playersPerHour}</span>
                </div>
                <div className="h-6 w-px bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#626860]">Checked in</span>
                  <span className="text-sm font-black text-[#151713]">{summary.checkedInTotal}</span>
                </div>
                <div className="h-6 w-px bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#626860]">Total courts</span>
                  <span className="text-sm font-black text-[#151713]">{state.courts.length}</span>
                </div>
              </div>

              {/* ═══ Match Results ═══ */}
              {summary.matchResults.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.06em] text-[#626860]">Match Results</span>
                    <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">{summary.matchResults.length}</span>
                  </div>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-2">
                    {summary.matchResults.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[#fbfaf7]">
                        <span className="w-4 text-[10px] font-bold text-[#b0b4ae]">#{i + 1}</span>
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className={m.winner === "A" ? "font-bold text-[#151713]" : "text-[#8a8f89]"}>
                            {m.teamAPlayers.join(" & ")}
                          </span>
                          {m.score && (
                            <span className="shrink-0 rounded-full bg-[#f3f3ef] px-2 py-0.5 font-bold text-[#151713]">{m.score}</span>
                          )}
                          <span className={m.winner === "B" ? "font-bold text-[#151713]" : "text-[#8a8f89]"}>
                            {m.teamBPlayers.join(" & ")}
                          </span>
                        </div>
                        {m.winner === "A" && <span className="shrink-0 rounded bg-[#eff9d8] px-1.5 py-0.5 text-[10px] font-bold text-[#367b20]">W</span>}
                        {m.winner === "B" && <span className="shrink-0 rounded bg-[#e8f1ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2d5a8a]">W</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Player Leaderboard ═══ */}
              {summary.leaderboard.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.06em] text-[#626860]">Player Leaderboard</span>
                    <span className="rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[10px] font-medium text-[#5d615b]">{summary.leaderboard.length}</span>
                  </div>
                  <div className="space-y-1 rounded-xl border border-black/[0.06] bg-white p-2">
                    {summary.leaderboard.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#fbfaf7]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#151713] text-[10px] font-bold text-white">#{i + 1}</span>
                        <span className="flex-1 text-sm font-medium text-[#151713]">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs">
                            <span className="font-bold text-[#367b20]">{p.wins}</span>
                            <span className="text-[#8a8f89]">W</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <span className="font-bold text-[#b91c1c]">{p.losses}</span>
                            <span className="text-[#8a8f89]">L</span>
                          </span>
                          <span className="ml-1 text-xs font-medium text-[#626860]">
                            {p.wins + p.losses > 0 ? `${Math.round((p.wins / (p.wins + p.losses)) * 100)}%` : "-"}
                          </span>
                        </div>
                        {/* Win-rate bar */}
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-red-100">
                          <div className="h-full rounded-full bg-[#b9f34b]" style={{ width: `${p.wins + p.losses > 0 ? (p.wins / (p.wins + p.losses)) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Court Utilization ═══ */}
              <div>
                <span className="text-xs font-black uppercase tracking-[0.06em] text-[#626860]">Court Utilization</span>
                <div className="mt-2 space-y-2 rounded-xl border border-black/[0.06] bg-white p-3">
                  {summary.courtUtil.map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-semibold text-[#151713]">{c.name}</span>
                      <div className="flex-1 h-5 rounded-full bg-black/[0.05] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${c.utilizationPct > 80 ? "bg-gradient-to-r from-[#b9f34b] to-[#8fd42a]" : c.utilizationPct > 40 ? "bg-gradient-to-r from-[#d4e87a] to-[#b9d94a]" : "bg-gradient-to-r from-[#e0e0dc] to-[#d0d0cc]"}`}
                          style={{ width: `${c.utilizationPct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-[#151713]">{c.utilizationPct}%</span>
                      <span className="w-14 text-right text-[10px] text-[#8a8f89]">{formatElapsed(c.utilizedSeconds)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Activity Chart ═══ */}
              {summary.busyBuckets.length > 0 && (
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.06em] text-[#626860]">Session Activity</span>
                  <div className="mt-2 rounded-xl border border-black/[0.06] bg-white p-4">
                    <div className="flex items-end gap-[2px]" style={{ height: "60px" }}>
                      {summary.busyBuckets.map((b, i) => {
                        const maxCount = Math.max(...summary.busyBuckets.map((x) => x.count), 1);
                        const heightPct = Math.round((b.count / maxCount) * 100);
                        const isPeak = b.count >= maxCount;
                        return (
                          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                            <div className="mb-0.5 hidden text-[8px] font-medium text-[#626860] group-hover:block">{b.count}</div>
                            <div
                              className={`w-full rounded-t transition-all ${isPeak ? "bg-[#b9f34b]" : "bg-[#d4e87a]"} ${b.count === 0 ? "bg-[#f0f0ee]" : ""}`}
                              style={{ height: `${Math.max(2, heightPct)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[8px] font-medium text-[#8a8f89]">
                      <span>Start</span>
                      <span>{Math.floor(sessionElapsed / 60)}m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ Actions ═══ */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSummary(false)}
                >
                  Continue Session
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    await endSession(sessionId!);
                    setShowSummary(false);
                    window.location.reload();
                  }}
                >
                  End Session
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  onChangeDuration: (courtId: string, minutes: number) => void;
  onCustomDuration?: (courtId: string) => void;
}

function CourtControlPanel({
  court,
  onStartGame,
  onTogglePause,
  onResetTimer,
  onEndGame,
  onChangeDuration,
}: CourtControlProps) {
  const isActive = court.status === "active";
  const isReady = court.status === "ready";
  const isEmpty = court.status === "empty";

  const elapsed = court.elapsedSeconds;
  const targetMinutes = court.durationMinutes;
  const progress = getProgressPercent(elapsed, targetMinutes);
  const isOverTime = isActive && targetMinutes > 0 && elapsed > targetMinutes * 60;
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(String(targetMinutes));

  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        isActive && "border-l-4 border-l-[#b9f34b]",
        isReady && "border-l-4 border-l-[#5b8def]",
        isEmpty && "border-black/[0.07]",
        isOverTime && "ring-2 ring-amber-400",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-0">
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

        {/* Timer display + duration preset */}
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <Clock className={cn("h-4 w-4", court.isPaused ? "text-amber-400" : isOverTime ? "text-red-500" : "text-[#65ad00]")} />
              <span className={cn("font-mono text-lg font-bold tabular-nums", isOverTime ? "text-red-500" : "text-[#151713]")}>
                {formatElapsed(court.elapsedSeconds)}
              </span>
            </>
          )}
          {(isEmpty || isReady || isActive) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDurationPicker(!showDurationPicker)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  isOverTime
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-[#f3f3ef] text-[#626860] hover:bg-[#e8e8e4]",
                )}
              >
                <Clock className="h-3 w-3" />
                {formatDuration(court.durationMinutes * 60)}
              </button>
              {showDurationPicker && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-black/[0.07] bg-white p-1.5 shadow-lg">
                  {DURATION_PRESETS.map((preset) =>
                    preset.value === -1 ? (
                      <CustomDurationInput
                        key="custom"
                        currentMinutes={court.durationMinutes}
                        onApply={(mins) => {
                          onChangeDuration(court.courtId, mins);
                          setShowDurationPicker(false);
                        }}
                        onClose={() => setShowDurationPicker(false)}
                      />
                    ) : (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          onChangeDuration(court.courtId, preset.value);
                          setShowDurationPicker(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-[#f3f3ef]",
                          court.durationMinutes === preset.value && "bg-[#eff9d8] text-[#367b20]",
                        )}
                      >
                        {preset.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timer progress bar */}
      {isActive && targetMinutes > 0 && (
        <div className="px-4 pt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                progress > 100 ? "bg-red-400" : progress > 80 ? "bg-amber-400" : "bg-[#b9f34b]",
              )}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] font-medium text-[#8a8f89]">
            <span>{formatElapsed(elapsed)}</span>
            <span>{formatDuration(targetMinutes * 60)}</span>
          </div>
        </div>
      )}

      {/* Overtime banner */}
      {isOverTime && (
        <div className="mx-4 mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5 animate-pulse" />
          Past time — consider ending the game
        </div>
      )}

      {/* Players (active game) */}
      {isActive && court.group && (
        <div className="space-y-2 p-4 pb-0">
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
        <div className="mx-4 mt-4 flex h-14 items-center justify-center rounded-lg bg-[#fbfaf7]">
          <p className="text-sm text-[#b0b4ae]">
            Assign a group to start
          </p>
        </div>
      )}

      {/* Ready state (group assigned, waiting to start) */}
      {isReady && court.group && (
        <div className="space-y-3 p-4 pb-0">
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
      <div className="flex flex-wrap gap-2 p-4">
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

/* ── Custom duration inline input ── */

function CustomDurationInput({
  currentMinutes,
  onApply,
  onClose,
}: {
  currentMinutes: number;
  onApply: (minutes: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(currentMinutes));

  return (
    <div className="rounded-lg bg-[#fbfaf7] px-3 py-2">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#626860]">Custom</span>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="min"
          className="h-8 w-full rounded-lg text-center text-sm font-bold"
          inputMode="numeric"
        />
        <span className="text-xs font-medium text-[#626860]">min</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg py-1 text-[11px] font-semibold text-[#626860] transition-colors hover:bg-[#e8e8e4]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const mins = parseInt(value, 10);
            if (mins > 0) onApply(mins);
          }}
          disabled={!value || parseInt(value, 10) <= 0}
          className="flex-1 rounded-lg bg-[#151713] py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2d28] disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
