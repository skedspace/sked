"use client";

import { addDays, format, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Grid2X2,
  ListFilter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Types ──

type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "pool_play";

type TournamentStatus =
  | "draft"
  | "registration"
  | "in_progress"
  | "completed"
  | "cancelled";

type OpenPlayStatus = "active" | "cancelled" | "completed";

type Tournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  skillLevel: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  participants: number;
  maxParticipants: number;
  matchCount: number;
  completedMatches: number;
  description: string;
  entryFee: string;
};

type OpenPlaySession = {
  id: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  court: string;
  skillLevel: string;
  capacity: number;
  registered: number;
  price: string;
  status: OpenPlayStatus;
  recurring: boolean;
  waitlist: number;
};

// ── Mock Data ──

const TOURNAMENTS: Tournament[] = [
  {
    id: "t1",
    name: "QC Summer Slam",
    format: "single_elimination",
    skillLevel: "3.0 – 4.0",
    startDate: "2026-08-15",
    endDate: "2026-08-16",
    status: "registration",
    participants: 24,
    maxParticipants: 32,
    matchCount: 16,
    completedMatches: 0,
    description: "Men's & Women's Doubles. Prize pool ₱15,000.",
    entryFee: "₱500",
  },
  {
    id: "t2",
    name: "Wednesday Round Robin",
    format: "round_robin",
    skillLevel: "2.5 – 3.5",
    startDate: "2026-08-06",
    endDate: "2026-08-06",
    status: "registration",
    participants: 12,
    maxParticipants: 16,
    matchCount: 12,
    completedMatches: 0,
    description: "Mixed doubles round robin. 4 games guaranteed.",
    entryFee: "₱350",
  },
  {
    id: "t3",
    name: "Club Championships",
    format: "pool_play",
    skillLevel: "All levels",
    startDate: "2026-07-25",
    endDate: "2026-07-27",
    status: "in_progress",
    participants: 48,
    maxParticipants: 48,
    matchCount: 40,
    completedMatches: 28,
    description: "Annual club championship. Pool play + bracket.",
    entryFee: "Members only",
  },
  {
    id: "t4",
    name: "August Doubles Classic",
    format: "double_elimination",
    skillLevel: "4.0+",
    startDate: "2026-08-22",
    endDate: "2026-08-23",
    status: "draft",
    participants: 0,
    maxParticipants: 24,
    matchCount: 0,
    completedMatches: 0,
    description: "Advanced doubles tournament. Double elimination format.",
    entryFee: "₱600",
  },
  {
    id: "t5",
    name: "July Social Mixer",
    format: "round_robin",
    skillLevel: "All levels",
    startDate: "2026-07-18",
    endDate: "2026-07-18",
    status: "completed",
    participants: 20,
    maxParticipants: 20,
    matchCount: 15,
    completedMatches: 15,
    description: "Fun social round robin with random partner rotation.",
    entryFee: "₱250",
  },
];

const OPEN_PLAY_SESSIONS: OpenPlaySession[] = [
  {
    id: "op1",
    day: "Mon",
    date: "2026-07-28",
    startTime: "7:00 AM",
    endTime: "9:00 AM",
    court: "Court 1",
    skillLevel: "All levels",
    capacity: 8,
    registered: 6,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 0,
  },
  {
    id: "op2",
    day: "Mon",
    date: "2026-07-28",
    startTime: "5:00 PM",
    endTime: "7:00 PM",
    court: "Court 3",
    skillLevel: "3.0+",
    capacity: 8,
    registered: 8,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 3,
  },
  {
    id: "op3",
    day: "Tue",
    date: "2026-07-29",
    startTime: "7:00 AM",
    endTime: "9:00 AM",
    court: "Court 2",
    skillLevel: "All levels",
    capacity: 8,
    registered: 4,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 0,
  },
  {
    id: "op4",
    day: "Tue",
    date: "2026-07-29",
    startTime: "6:00 PM",
    endTime: "8:00 PM",
    court: "Court 1",
    skillLevel: "Women only",
    capacity: 8,
    registered: 7,
    price: "₱200",
    status: "active",
    recurring: true,
    waitlist: 1,
  },
  {
    id: "op5",
    day: "Wed",
    date: "2026-07-30",
    startTime: "7:00 AM",
    endTime: "9:00 AM",
    court: "Court 4",
    skillLevel: "3.5+",
    capacity: 8,
    registered: 5,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 0,
  },
  {
    id: "op6",
    day: "Thu",
    date: "2026-07-31",
    startTime: "5:00 PM",
    endTime: "7:00 PM",
    court: "Court 2",
    skillLevel: "All levels",
    capacity: 8,
    registered: 3,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 0,
  },
  {
    id: "op7",
    day: "Fri",
    date: "2026-08-01",
    startTime: "7:00 AM",
    endTime: "9:00 AM",
    court: "Court 1",
    skillLevel: "All levels",
    capacity: 8,
    registered: 8,
    price: "₱250",
    status: "active",
    recurring: true,
    waitlist: 5,
  },
  {
    id: "op8",
    day: "Sat",
    date: "2026-08-02",
    startTime: "8:00 AM",
    endTime: "10:00 AM",
    court: "Court 3",
    skillLevel: "All levels",
    capacity: 8,
    registered: 2,
    price: "₱300",
    status: "active",
    recurring: false,
    waitlist: 0,
  },
];

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  pool_play: "Pool Play + Bracket",
};

const FORMAT_ICONS: Record<TournamentFormat, string> = {
  single_elimination: "🏆",
  double_elimination: "🔄",
  round_robin: "🔁",
  pool_play: "📊",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#f3f3ef] text-[#5d615b]",
  registration: "bg-[#e8f1ff] text-[#2764ad]",
  in_progress: "bg-[#eff9d8] text-[#367b20]",
  completed: "bg-[#f0f0f0] text-[#5d615b]",
  cancelled: "bg-[#fde9e7] text-[#d43831]",
  active: "bg-[#eff9d8] text-[#367b20]",
  upcoming: "bg-[#e8f1ff] text-[#2764ad]",
  full: "bg-[#fff5d9] text-[#ad7400]",
};

// ── Helpers ──

function formatDateRange(start: string, end: string) {
  if (start === end) return format(new Date(`${start}T12:00:00`), "MMM d, yyyy");
  return `${format(new Date(`${start}T12:00:00`), "MMM d")} – ${format(new Date(`${end}T12:00:00`), "MMM d, yyyy")}`;
}

function tournamentCode(id: string) {
  return `#TR-${
    id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() || "00000"
  }`;
}

// ── Component ──

export function TournamentsView() {
  const [tab, setTab] = useState<"tournaments" | "open-play">("tournaments");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailTournament, setDetailTournament] = useState<Tournament | null>(null);
  const [showNewTournament, setShowNewTournament] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [selectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute week bounds
  const weekStartDate = addDays(
    startOfWeek(selectedDate, { weekStartsOn: 1 }),
    weekOffset * 7,
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  // ── Derived data ──

  const activeTournaments = TOURNAMENTS.filter(
    (t) => t.status === "registration" || t.status === "in_progress",
  ).length;
  const totalParticipants = TOURNAMENTS.reduce((s, t) => s + t.participants, 0);
  const openPlayToday = OPEN_PLAY_SESSIONS.filter(
    (s) => s.date === format(new Date(), "yyyy-MM-dd") && s.status === "active",
  ).length;
  const openPlayAvailable = OPEN_PLAY_SESSIONS.filter(
    (s) => s.status === "active",
  ).reduce((s, session) => s + (session.capacity - session.registered), 0);

  // Filter tournaments
  const filteredTournaments = TOURNAMENTS.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort tournaments: in_progress first, then registration, then draft, then completed
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    const order: Record<string, number> = {
      in_progress: 0,
      registration: 1,
      draft: 2,
      completed: 3,
      cancelled: 4,
    };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  // Filter open play by selected week
  const weekSessions = OPEN_PLAY_SESSIONS.filter((s) => {
    if (s.recurring) return true;
    return weekDays.some((d) => format(d, "yyyy-MM-dd") === s.date);
  }).filter((s) => s.status === "active");

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sortedSessions = [...weekSessions].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day),
  );

  // Stats
  const totalCapacity = weekSessions.reduce((s, session) => s + session.capacity, 0);
  const totalRegistered = weekSessions.reduce((s, session) => s + session.registered, 0);
  const fullSessions = weekSessions.filter(
    (s) => s.registered >= s.capacity,
  ).length;

  return (
    <div className="mx-auto max-w-[1660px] space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Tournaments &amp; Open Play
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Organize tournaments, round robins, and open play sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-4 text-xs font-bold shadow-sm transition-colors hover:border-black/20"
          >
            <CalendarDays className="h-4 w-4" />
            {format(weekStartDate, "MMM d")} –{" "}
            {format(addDays(weekStartDate, 6), "MMM d, yyyy")}
            <ChevronDown className="h-3.5 w-3.5 text-[#696e65]" />
          </button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={() =>
              tab === "tournaments"
                ? setShowNewTournament(true)
                : setShowNewSession(true)
            }
          >
            <Plus />
            {tab === "tournaments" ? "New tournament" : "New session"}
          </Button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy />}
          label="Active Tournaments"
          value={String(activeTournaments)}
          detail="Registration or in progress"
          tone="green"
        />
        <StatCard
          icon={<Users />}
          label="Total Participants"
          value={String(totalParticipants)}
          detail="Across all tournaments"
          tone="green"
        />
        <StatCard
          icon={<Clock />}
          label={tab === "tournaments" ? "Open Play Today" : "This Week"}
          value={String(openPlayToday || weekSessions.length)}
          detail={tab === "tournaments" ? "Active sessions" : "Scheduled sessions"}
          tone="amber"
        />
        <StatCard
          icon={<Grid2X2 />}
          label="Available Spots"
          value={String(openPlayAvailable)}
          detail="Across open sessions"
          tone="amber"
        />
      </section>

      {/* Tabs */}
      <div className="border-b border-black/[0.07]">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setTab("tournaments")}
            className={cn(
              "border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
              tab === "tournaments"
                ? "border-[#62c51c] text-[#171a16]"
                : "border-transparent text-[#5f655d] hover:text-[#171a16]",
            )}
          >
            <Swords className="mr-2 inline h-4 w-4" />
            Tournaments
          </button>
          <button
            type="button"
            onClick={() => setTab("open-play")}
            className={cn(
              "border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
              tab === "open-play"
                ? "border-[#62c51c] text-[#171a16]"
                : "border-transparent text-[#5f655d] hover:text-[#171a16]",
            )}
          >
            <Users className="mr-2 inline h-4 w-4" />
            Open Play
          </button>
        </div>
      </div>

      {/* ──────────────── TOURNAMENTS TAB ──────────────── */}
      {tab === "tournaments" && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments by name..."
                className="pl-11"
              />
            </label>
            <div className="relative inline-flex h-10 min-w-36 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
              <select
                className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-4 text-xs font-bold capitalize outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All status</option>
                <option value="draft">Draft</option>
                <option value="registration">Registration</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#626860]" />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Clear filters"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              <ListFilter />
            </Button>
          </div>

          {/* Tournament Cards */}
          {sortedTournaments.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.07] bg-white p-14 text-center shadow-[0_8px_26px_rgba(23,26,22,0.035)]">
              <Trophy className="mx-auto mb-4 h-10 w-10 text-[#b9c3b1]" />
              <p className="text-sm font-bold text-[#6b7068]">
                No tournaments match your filters.
              </p>
              <p className="mt-1 text-xs text-[#8c9289]">
                Create a new tournament to get started.
              </p>
              <Button
                className="mt-5 bg-[#050604] px-6 text-white hover:bg-[#171a16]"
                onClick={() => setShowNewTournament(true)}
              >
                <Plus /> New tournament
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onSelect={setDetailTournament}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ──────────────── OPEN PLAY TAB ──────────────── */}
      {tab === "open-play" && (
        <>
          {/* Week Navigator */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#5f655d]">
              Showing week of{" "}
              <span className="text-[#171a16]">
                {format(weekStartDate, "MMM d, yyyy")}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] transition-colors hover:bg-black/[0.03]"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] transition-colors hover:bg-black/[0.03]"
                onClick={() => setWeekOffset(0)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] transition-colors hover:bg-black/[0.03]"
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats row for open play */}
          <section className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Total capacity" value={String(totalCapacity)} />
            <MiniStat label="Registered players" value={String(totalRegistered)} />
            <MiniStat
              label="Full sessions"
              value={String(fullSessions)}
              note={fullSessions > 0 ? `${fullSessions} session(s) at capacity` : undefined}
            />
          </section>

          {/* Weekly Schedule Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedSessions.map((session) => (
              <OpenPlayCard key={session.id} session={session} />
            ))}
          </div>

          {sortedSessions.length === 0 && (
            <div className="rounded-2xl border border-black/[0.07] bg-white p-14 text-center shadow-[0_8px_26px_rgba(23,26,22,0.035)]">
              <Users className="mx-auto mb-4 h-10 w-10 text-[#b9c3b1]" />
              <p className="text-sm font-bold text-[#6b7068]">
                No open play sessions this week.
              </p>
              <p className="mt-1 text-xs text-[#8c9289]">
                Schedule recurring or one-time open play sessions.
              </p>
              <Button
                className="mt-5 bg-[#050604] px-6 text-white hover:bg-[#171a16]"
                onClick={() => setShowNewSession(true)}
              >
                <Plus /> New session
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Tournament Detail Side Panel ── */}
      {detailTournament && (
        <TournamentDetailPanel
          tournament={detailTournament}
          onClose={() => setDetailTournament(null)}
        />
      )}

      {/* ── New Tournament Dialog ── */}
      {showNewTournament && (
        <NewTournamentDialog onClose={() => setShowNewTournament(false)} />
      )}

      {/* ── New Open Play Session Dialog ── */}
      {showNewSession && (
        <NewSessionDialog onClose={() => setShowNewSession(false)} />
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const bgMap = {
    green: "bg-[#f1f9df] text-[#317b20]",
    amber: "bg-[#fff5d9] text-[#ad7400]",
    red: "bg-[#fde9e7] text-[#d43831]",
    blue: "bg-[#e8f1ff] text-[#2764ad]",
  };

  return (
    <article className="flex min-h-28 items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_8px_26px_rgba(23,26,22,0.035)]">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-full",
          bgMap[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#4e534d]">{label}</p>
        <p className="mt-1 text-[1.5rem] leading-none font-black tracking-[-0.035em] text-[#151713]">
          {value}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[10px]">{detail}</p>
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-3.5 shadow-sm">
      <p className="text-xs font-bold text-[#4e534d]">{label}</p>
      <p className="ml-auto text-lg font-black text-[#151713]">{value}</p>
      {note && <p className="text-[10px] text-[#ad7400]">{note}</p>}
    </article>
  );
}

function TournamentCard({
  tournament,
  onSelect,
}: {
  tournament: Tournament;
  onSelect: (t: Tournament) => void;
}) {
  const progress =
    tournament.matchCount > 0
      ? Math.round((tournament.completedMatches / tournament.matchCount) * 100)
      : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(tournament)}
      className="group relative flex flex-col rounded-2xl border border-black/[0.07] bg-white p-5 text-left shadow-[0_8px_26px_rgba(23,26,22,0.035)] transition-all hover:shadow-[0_12px_32px_rgba(23,26,22,0.08)] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1f9df] text-lg">
            {FORMAT_ICONS[tournament.format]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#171a16]">
              {tournament.name}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#6b7068]">
              {tournamentCode(tournament.id)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-bold capitalize",
            STATUS_STYLES[tournament.status],
          )}
        >
          {tournament.status.replace("_", " ")}
        </span>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-[#5f655d]">
          <Swords className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{FORMAT_LABELS[tournament.format]}</span>
          <span className="text-[#bcc2ba]">·</span>
          <span>{tournament.skillLevel}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5f655d]">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5f655d]">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {tournament.participants} / {tournament.maxParticipants} participants
          </span>
        </div>
      </div>

      {/* Divider + Price */}
      <div className="mt-4 border-t border-black/[0.06] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#6b7068]">
            {tournament.entryFee}
          </span>

          {/* Progress bar */}
          {tournament.matchCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#6b7068]">
                {tournament.completedMatches}/{tournament.matchCount} matches
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#f0f0ea]">
                <div
                  className="h-full rounded-full bg-[#65ad00] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover indicator */}
      <span className="absolute right-4 bottom-4 text-[10px] font-bold text-[#65ad00] opacity-0 transition-opacity group-hover:opacity-100">
        View details →
      </span>
    </button>
  );
}

function OpenPlayCard({ session }: { session: OpenPlaySession }) {
  const isFull = session.registered >= session.capacity;
  const fillPercent = Math.round((session.registered / session.capacity) * 100);
  const statusLabel = isFull ? "full" : session.status === "active" ? "active" : "upcoming";

  return (
    <article className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_8px_26px_rgba(23,26,22,0.035)] transition-all hover:shadow-[0_12px_32px_rgba(23,26,22,0.08)]">
      {/* Day + Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#171a16]">
          {session.day} {format(new Date(`${session.date}T12:00:00`), "MMM d")}
        </span>
        <span
          className={cn(
            "rounded-lg px-2.5 py-1 text-[9px] font-bold capitalize",
            STATUS_STYLES[statusLabel],
          )}
        >
          {isFull ? "Full" : session.status}
        </span>
      </div>

      {/* Time + Court */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#6b7068]" />
          <span className="font-semibold text-[#171a16]">
            {session.startTime} – {session.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5f655d]">
          <Grid2X2 className="h-3.5 w-3.5 shrink-0" />
          <span>{session.court}</span>
          <span className="text-[#bcc2ba]">·</span>
          <span>{session.skillLevel}</span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-[#6b7068]">
            {session.registered}/{session.capacity} players
          </span>
          <span className="font-semibold text-[#171a16]">{session.price}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0f0ea]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isFull ? "bg-[#e8a400]" : "bg-[#65ad00]",
            )}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Waitlist + Actions */}
      <div className="mt-3 flex items-center justify-between">
        {session.waitlist > 0 ? (
          <span className="text-[10px] font-semibold text-[#ad7400]">
            {session.waitlist} on waitlist
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            className="rounded-lg bg-[#f1f9df] px-2.5 py-1.5 text-[9px] font-bold text-[#367b20] transition-colors hover:bg-[#e3f2c8]"
          >
            Check in
          </button>
          <button
            type="button"
            className="rounded-lg border border-black/[0.06] px-2.5 py-1.5 text-[9px] font-bold text-[#6b7068] transition-colors hover:bg-black/[0.03]"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Recurring badge */}
      {session.recurring && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-black/[0.05] pt-2.5">
          <RefreshCw className="h-3 w-3 text-[#6b7068]" />
          <span className="text-[9px] font-semibold text-[#6b7068]">
            Recurring weekly
          </span>
        </div>
      )}
    </article>
  );
}

// ── Tournament Detail Panel ──

function TournamentDetailPanel({
  tournament,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) {
  const [view, setView] = useState<"details" | "matches" | "players" | "payments">("details");
  const [matches, setMatches] = useState([
    { round: "Round of 16", match: "Team A vs Team B", score: "21-15, 21-18", court: "Court 1", status: "completed" as const },
    { round: "Round of 16", match: "Team C vs Team D", score: "21-12, 19-21, 21-16", court: "Court 2", status: "completed" as const },
    { round: "Quarter-finals", match: "Team A vs Team C", score: "21-14, 21-17", court: "Court 1", status: "completed" as const },
    { round: "Semi-finals", match: "Team A vs Team E", score: "\u2014", court: "Court 1", status: "in_progress" as const },
    { round: "Final", match: "TBD vs TBD", score: "\u2014", court: "\u2014", status: "pending" as const },
  ]);
  const [players, setPlayers] = useState([
    { name: "Marco Santos", rating: "4.0", team: "Team Cruz / Santos", paid: true },
    { name: "Jenny Lim", rating: "3.5", team: "Team Cruz / Santos", paid: true },
    { name: "Rico Dizon", rating: "4.0", team: "Team Reyes / Lim", paid: true },
    { name: "Anna Cruz", rating: "3.5", team: "Team Reyes / Lim", paid: false },
    { name: "Kyle Tan", rating: "3.0", team: "Team Tan / Romero", paid: true },
    { name: "Mia Reyes", rating: "3.0", team: "Team Tan / Romero", paid: true },
    { name: "Cathy del Rosario", rating: "3.5", team: "Team Mercado / Torres", paid: true },
    { name: "Mark Co", rating: "3.0", team: "Team Mercado / Torres", paid: false },
  ]);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const progress =
    tournament.matchCount > 0
      ? Math.round((tournament.completedMatches / tournament.matchCount) * 100)
      : 0;

  // Generate mock bracket matches
  const bracketRounds =
    tournament.format === "round_robin"
      ? []
      : [
          { round: "Round of 16", matches: 8, completed: 8 },
          { round: "Quarter-finals", matches: 4, completed: 4 },
          { round: "Semi-finals", matches: 2, completed: tournament.status === "in_progress" ? 1 : 2 },
          { round: "Final", matches: 1, completed: tournament.status === "completed" ? 1 : 0 },
        ];

  // Generate mock standings for round robin
  const standings =
    tournament.format === "round_robin"
      ? [
          { rank: 1, team: "Team Cruz / Santos", wins: 4, losses: 0, diff: 28 },
          { rank: 2, team: "Team Reyes / Lim", wins: 3, losses: 1, diff: 15 },
          { rank: 3, team: "Team Tan / Romero", wins: 2, losses: 2, diff: 3 },
          { rank: 4, team: "Team Mercado / Torres", wins: 1, losses: 3, diff: -10 },
          { rank: 5, team: "Team Villanueva / Morales", wins: 0, losses: 4, diff: -36 },
        ]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Panel Header */}
        <div className="sticky top-0 z-10 border-b border-black/[0.07] bg-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#6b7068]">
                {tournamentCode(tournament.id)}
              </span>
              <h2 className="mt-1 text-xl font-black text-[#171a16]">
                {tournament.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] text-sm transition-colors hover:bg-black/[0.03]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <DetailBlock label="Format" value={FORMAT_LABELS[tournament.format]} />
            <DetailBlock label="Skill Level" value={tournament.skillLevel} />
            <DetailBlock
              label="Dates"
              value={formatDateRange(tournament.startDate, tournament.endDate)}
            />
            <DetailBlock label="Entry Fee" value={tournament.entryFee} />
            <DetailBlock
              label="Participants"
              value={`${tournament.participants} / ${tournament.maxParticipants}`}
            />
            <DetailBlock
              label="Status"
              value={tournament.status.replace("_", " ")}
              highlight
            />
          </div>

          {/* ── Conditional sub-views ── */}
          {view === "details" && (
            <>
              {/* Description */}
              <div>
                <p className="text-xs font-bold text-[#777c73]">Description</p>
                <p className="mt-1 text-sm text-[#171a16]">{tournament.description}</p>
              </div>

              {/* Progress */}
              {tournament.matchCount > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#777c73]">Match progress</span>
                    <span className="font-semibold text-[#6b7068]">
                      {tournament.completedMatches}/{tournament.matchCount} completed
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0f0ea]">
                    <div
                      className="h-full rounded-full bg-[#65ad00] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Bracket rounds (elimination formats) */}
              {bracketRounds.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#777c73]">Bracket</h3>
                  <div className="mt-2 space-y-1.5">
                    {bracketRounds.map((round) => {
                      const roundProgress =
                        round.matches > 0
                          ? Math.round((round.completed / round.matches) * 100)
                          : 0;
                      return (
                        <div
                          key={round.round}
                          className="flex items-center justify-between rounded-lg bg-[#f6f7f2] px-3.5 py-2.5"
                        >
                          <span className="text-xs font-bold text-[#171a16]">
                            {round.round}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#6b7068]">
                              {round.completed}/{round.matches}
                            </span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#e5e7e0]">
                              <div
                                className="h-full rounded-full bg-[#65ad00]"
                                style={{ width: `${roundProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standings (round robin format) */}
              {standings && (
                <div>
                  <h3 className="text-xs font-bold text-[#777c73]">Standings</h3>
                  <div className="mt-2 overflow-hidden rounded-xl border border-black/[0.06]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#f6f7f2] text-[10px] font-black text-[#5f655d] uppercase">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Team</th>
                          <th className="px-3 py-2 text-center">W</th>
                          <th className="px-3 py-2 text-center">L</th>
                          <th className="px-3 py-2 text-right">+/-</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row) => (
                          <tr
                            key={row.rank}
                            className="border-t border-black/[0.05]"
                          >
                            <td className="px-3 py-2 font-black text-[#6b7068]">
                              {row.rank <= 3 ? (
                                <span className="text-[#e8a400]">{row.rank}</span>
                              ) : (
                                row.rank
                              )}
                            </td>
                            <td className="px-3 py-2 font-semibold">{row.team}</td>
                            <td className="px-3 py-2 text-center font-black text-[#367b20]">
                              {row.wins}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-[#d43831]">
                              {row.losses}
                            </td>
                            <td className="px-3 py-2 text-right font-black">
                              <span className={row.diff > 0 ? "text-[#367b20]" : "text-[#d43831]"}>
                                {row.diff > 0 ? "+" : ""}
                                {row.diff}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Manage Matches view ── */}
          {view === "matches" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#171a16]">Matches</h3>
                <Button
                  size="sm"
                  className="bg-[#050604] text-white hover:bg-[#171a16]"
                  onClick={() => setShowAddMatch(true)}
                >
                  <Plus className="h-4 w-4" /> Add match
                </Button>
              </div>

              {showAddMatch && (
                <AddMatchForm
                  onAdd={(m) => {
                    setMatches((prev) => [m, ...prev]);
                    setShowAddMatch(false);
                  }}
                  onCancel={() => setShowAddMatch(false)}
                />
              )}

              {matches.length === 0 && !showAddMatch ? (
                <p className="py-6 text-center text-sm text-[#8a8f89]">
                  No matches yet. Add your first match to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-black/[0.07] bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#777c73]">{m.round}</span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold capitalize",
                          m.status === "completed" ? "bg-[#eff9d8] text-[#367b20]" :
                          m.status === "in_progress" ? "bg-[#e8f1ff] text-[#2764ad]" :
                          "bg-[#f3f3ef] text-[#5d615b]"
                        )}>
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-[#171a16]">{m.match}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-[#6b7068]">
                        <span>{m.score}</span>
                        <span className="text-[#bcc2ba]">·</span>
                        <span>{m.court}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manage Players view ── */}
          {view === "players" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#171a16]">
                  Players ({players.length}/{tournament.maxParticipants})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddPlayer(true)}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {showAddPlayer && (
                <AddPlayerForm
                  onAdd={(p) => {
                    setPlayers((prev) => [...prev, p]);
                    setShowAddPlayer(false);
                  }}
                  onCancel={() => setShowAddPlayer(false)}
                />
              )}

              {players.length === 0 && !showAddPlayer ? (
                <p className="py-6 text-center text-sm text-[#8a8f89]">
                  No players registered yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {players.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-black/[0.06] px-4 py-3"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#151713] text-[11px] font-bold text-white">
                        {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#171a16]">{p.name}</p>
                        <p className="text-[10px] text-[#777c73]">{p.team} · {p.rating}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold",
                        p.paid ? "text-[#367b20]" : "text-[#d43831]"
                      )}>
                        {p.paid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Payments view ── */}
          {view === "payments" && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#171a16]">Payments</h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailBlock label="Entry Fee" value={tournament.entryFee} />
                <DetailBlock label="Participants" value={String(tournament.participants)} />
                <DetailBlock
                  label="Total Collected"
                  value={`₱${parseInt(tournament.entryFee.replace(/[^0-9]/g, "")) * tournament.participants}`}
                  highlight
                />
                <DetailBlock label="Pending" value="2 players" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[#777c73]">Recent transactions</p>
                {[
                  { name: "Marco Santos", amount: tournament.entryFee, date: "Jul 25", status: "completed" },
                  { name: "Jenny Lim", amount: tournament.entryFee, date: "Jul 24", status: "completed" },
                  { name: "Rico Dizon", amount: tournament.entryFee, date: "Jul 24", status: "completed" },
                  { name: "Kyle Tan", amount: tournament.entryFee, date: "Jul 23", status: "completed" },
                  { name: "Anna Cruz", amount: tournament.entryFee, date: "—", status: "pending" },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-[#f6f7f2] px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#171a16]">{t.name}</p>
                      <p className="text-[10px] text-[#6b7068]">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#171a16]">{t.amount}</p>
                      <span className={cn(
                        "text-[9px] font-bold",
                        t.status === "completed" ? "text-[#367b20]" : "text-[#ad7400]"
                      )}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── View switcher tabs ── */}
          <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-4">
            <Button
              variant={view === "details" ? "default" : "outline"}
              onClick={() => setView("details")}
              className={view === "details" ? "bg-[#050604] text-white hover:bg-[#171a16]" : ""}
            >
              <Swords className="h-4 w-4" /> Details
            </Button>
            <Button
              variant={view === "matches" ? "default" : "outline"}
              onClick={() => setView("matches")}
              className={view === "matches" ? "bg-[#050604] text-white hover:bg-[#171a16]" : ""}
            >
              <Trophy className="h-4 w-4" /> Matches
            </Button>
            <Button
              variant={view === "players" ? "default" : "outline"}
              onClick={() => setView("players")}
              className={view === "players" ? "bg-[#050604] text-white hover:bg-[#171a16]" : ""}
            >
              <Users className="h-4 w-4" /> Players
            </Button>
            <Button
              variant={view === "payments" ? "default" : "outline"}
              onClick={() => setView("payments")}
              className={view === "payments" ? "bg-[#050604] text-white hover:bg-[#171a16]" : ""}
            >
              <CircleDollarSign className="h-4 w-4" /> Payments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Match Form ──

function AddMatchForm({
  onAdd,
  onCancel,
}: {
  onAdd: (match: { round: string; match: string; score: string; court: string; status: "pending" }) => void;
  onCancel: () => void;
}) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [round, setRound] = useState("Round of 16");
  const [court, setCourt] = useState("Court 1");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!team1.trim() || !team2.trim()) return;
    onAdd({
      round,
      match: `${team1.trim()} vs ${team2.trim()}`,
      score: "\u2014",
      court,
      status: "pending",
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-black/[0.07] bg-[#f6f7f2] p-4 space-y-3"
    >
      <p className="text-xs font-bold text-[#171a16]">New Match</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Team 1</Label>
          <Input
            value={team1}
            onChange={(e) => setTeam1(e.target.value)}
            placeholder="e.g. Team Cruz / Santos"
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <Label className="text-[10px]">Team 2</Label>
          <Input
            value={team2}
            onChange={(e) => setTeam2(e.target.value)}
            placeholder="e.g. Team Reyes / Lim"
            className="h-9 text-sm"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Round</Label>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.07] bg-white px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#65ad00]"
          >
            <option>Round of 16</option>
            <option>Quarter-finals</option>
            <option>Semi-finals</option>
            <option>Final</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Court</Label>
          <select
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.07] bg-white px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#65ad00]"
          >
            <option>Court 1</option>
            <option>Court 2</option>
            <option>Court 3</option>
            <option>Court 4</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="bg-[#050604] text-white hover:bg-[#171a16]"
          disabled={!team1.trim() || !team2.trim()}
        >
          Add match
        </Button>
      </div>
    </form>
  );
}

// ── Add Player Form ──

function AddPlayerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (player: { name: string; rating: string; team: string; paid: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState("3.0");
  const [team, setTeam] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !team.trim()) return;
    onAdd({
      name: name.trim(),
      rating,
      team: team.trim(),
      paid: false,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-black/[0.07] bg-[#f6f7f2] p-4 space-y-3"
    >
      <p className="text-xs font-bold text-[#171a16]">New Player</p>
      <div>
        <Label className="text-[10px]">Player name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marco Santos"
          className="h-9 text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Rating</Label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.07] bg-white px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#65ad00]"
          >
            {["2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Team</Label>
          <Input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g. Team Cruz / Santos"
            className="h-9 text-sm"
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="bg-[#050604] text-white hover:bg-[#171a16]"
          disabled={!name.trim() || !team.trim()}
        >
          Add player
        </Button>
      </div>
    </form>
  );
}

function DetailBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#f6f7f2] p-3">
      <p className="text-[10px] font-bold text-[#777c73]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-black",
          highlight ? "text-[#2764ad]" : "text-[#171a16]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── New Tournament Dialog ──

function NewTournamentDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    format: "round_robin" as TournamentFormat,
    skillLevel: "3.0",
    startDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 15), "yyyy-MM-dd"),
    maxParticipants: "16",
    entryFee: "500",
    description: "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // In real app, save to DB
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#171a16]">New Tournament</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Tournament name</Label>
            <Input
              id="t-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. QC Summer Slam"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-format">Format</Label>
              <select
                id="t-format"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#65ad00]"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as TournamentFormat })}
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
                <option value="pool_play">Pool Play + Bracket</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-skill">Skill level</Label>
              <select
                id="t-skill"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#65ad00]"
                value={form.skillLevel}
                onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
              >
                <option value="All levels">All levels</option>
                <option value="2.5">2.5</option>
                <option value="3.0">3.0</option>
                <option value="3.5">3.5</option>
                <option value="4.0">4.0</option>
                <option value="4.5+">4.5+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-start">Start date</Label>
              <Input
                id="t-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-end">End date</Label>
              <Input
                id="t-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-capacity">Max participants</Label>
              <Input
                id="t-capacity"
                type="number"
                min={2}
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-fee">Entry fee (₱)</Label>
              <Input
                id="t-fee"
                type="number"
                min={0}
                value={form.entryFee}
                onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
                placeholder="0 = free"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-desc">Description</Label>
            <textarea
              id="t-desc"
              className="h-20 w-full resize-none rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#65ad00]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details about the tournament..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#050604] text-white hover:bg-[#171a16]"
              disabled={!form.name.trim()}
            >
              Create tournament
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Open Play Session Dialog ──

function NewSessionDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    day: format(new Date(), "yyyy-MM-dd"),
    startTime: "07:00",
    endTime: "09:00",
    court: "Court 1",
    skillLevel: "All levels",
    capacity: "8",
    price: "250",
    recurring: true,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // In real app, save to DB
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#171a16]">New Open Play Session</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="op-date">Date</Label>
            <Input
              id="op-date"
              type="date"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="op-start">Start time</Label>
              <Input
                id="op-start"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-end">End time</Label>
              <Input
                id="op-end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="op-court">Court</Label>
              <select
                id="op-court"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#65ad00]"
                value={form.court}
                onChange={(e) => setForm({ ...form, court: e.target.value })}
              >
                <option>Court 1</option>
                <option>Court 2</option>
                <option>Court 3</option>
                <option>Court 4</option>
                <option>Court 5</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-skill">Skill level</Label>
              <select
                id="op-skill"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#65ad00]"
                value={form.skillLevel}
                onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
              >
                <option>All levels</option>
                <option>2.5+</option>
                <option>3.0+</option>
                <option>3.5+</option>
                <option>4.0+</option>
                <option>Women only</option>
                <option>Men only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="op-capacity">Capacity</Label>
              <Input
                id="op-capacity"
                type="number"
                min={2}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-price">Price (₱)</Label>
              <Input
                id="op-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0 = free"
              />
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#65ad00]"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            />
            <span className="text-sm font-semibold text-[#171a16]">
              Repeat weekly
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#050604] text-white hover:bg-[#171a16]"
            >
              Create session
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
