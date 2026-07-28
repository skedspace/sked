"use client";

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Trophy,
  XCircle,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Match = {
  id: string;
  title: string;
  team_a: string;
  team_b: string;
  match_type: string;
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  score: string | null;
  participant_count: number;
  participant_capacity: number;
  notes: string | null;
  created_at: string;
  resources: { id?: string; name: string; type?: string | null } | null;
  services: { id?: string; name: string } | null;
};

type Resource = {
  id: string;
  name: string;
  type: string | null;
  capacity: number;
  is_active: boolean;
};

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
};

type MatchFormState = {
  title: string;
  teamA: string;
  teamB: string;
  resourceId: string;
  serviceId: string;
  matchType: string;
  date: string;
  startTime: string;
  endTime: string;
  status: Match["status"];
  score: string;
  participantCount: string;
  participantCapacity: string;
  notes: string;
};

const STATUS_OPTIONS: Match["status"][] = [
  "upcoming",
  "live",
  "completed",
  "cancelled",
];

const MATCH_TYPES = ["Doubles", "Singles", "Tournament", "League", "Open Play"];
const MATCH_TABS = [
  ["all", "All Matches"],
  ["upcoming", "Upcoming"],
  ["live", "Live"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function matchCode(id: string) {
  return `#MT-${
    id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() || "00000"
  }`;
}

function getFormDefaults(
  date: Date,
  resources: Resource[],
  services: Service[],
): MatchFormState {
  return {
    title: "",
    teamA: "",
    teamB: "",
    resourceId: resources[0]?.id ?? "",
    serviceId: services[0]?.id ?? "",
    matchType: "Doubles",
    date: dateParam(date),
    startTime: "09:00",
    endTime: "10:00",
    status: "upcoming",
    score: "",
    participantCount: "0",
    participantCapacity: "4",
    notes: "",
  };
}

function rangeFromForm(date: string, startTime: string, endTime: string) {
  return {
    start: new Date(`${date}T${startTime}:00`),
    end: new Date(`${date}T${endTime}:00`),
  };
}

export function MatchesView({
  orgId,
  matches,
  resources,
  services,
  selectedDate,
  weekStart,
  weekEnd,
}: {
  orgId: string;
  matches: Match[];
  resources: Resource[];
  services: Service[];
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const selectedDateValue = new Date(selectedDate);
  const weekStartValue = new Date(weekStart);
  const weekEndValue = new Date(weekEnd);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showFilterToolbar, setShowFilterToolbar] = useState(true);
  const [formState, setFormState] = useState<MatchFormState>(() =>
    getFormDefaults(selectedDateValue, resources, services),
  );

  const counts = {
    total: matches.length,
    completed: matches.filter((match) => match.status === "completed").length,
    upcoming: matches.filter((match) => match.status === "upcoming").length,
    live: matches.filter((match) => match.status === "live").length,
    cancelled: matches.filter((match) => match.status === "cancelled").length,
  };

  const matchTypes = Array.from(
    new Set(matches.map((match) => match.match_type)),
  );
  const PAGE_SIZE = 8;
  const filtered = matches.filter((match) => {
    const haystack =
      `${match.id} ${match.title} ${match.team_a} ${match.team_b} ${match.resources?.name ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesTab = tab === "all" || match.status === tab;
    const matchesCourt =
      courtFilter === "all" ||
      match.resources?.id === courtFilter ||
      match.resources?.name ===
        resources.find((resource) => resource.id === courtFilter)?.name;
    const matchesType = typeFilter === "all" || match.match_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || match.status === statusFilter;
    return (
      matchesQuery && matchesTab && matchesCourt && matchesType && matchesStatus
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const miniMonthStart = startOfMonth(selectedDateValue);
  const miniDays = eachDayOfInterval({
    start: startOfWeek(miniMonthStart, { weekStartsOn: 1 }),
    end: addDays(
      startOfWeek(endOfMonth(selectedDateValue), { weekStartsOn: 1 }),
      6,
    ),
  });
  const upcoming = matches
    .filter((match) => ["upcoming", "live"].includes(match.status))
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )
    .slice(0, 3);

  function navigateTo(date: Date) {
    router.push(`/dashboard/matches?date=${dateParam(date)}`);
  }

  function openNewMatch() {
    setFormError(null);
    setFormState(getFormDefaults(selectedDateValue, resources, services));
    setNewDialogOpen(true);
  }

  async function handleStatus(
    matchId: string,
    status: Match["status"],
    score?: string,
  ) {
    setActionId(matchId);
    await db
      .from("matches")
      .update({ status, score: score?.trim() || null })
      .eq("id", matchId);
    setActionId(null);
    setSelectedMatch(null);
    router.refresh();
  }

  async function handleNewMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const resource = resources.find((item) => item.id === formState.resourceId);
    const service = services.find((item) => item.id === formState.serviceId);
    const { start, end } = rangeFromForm(
      formState.date,
      formState.startTime,
      formState.endTime,
    );

    if (
      !resource ||
      !formState.title.trim() ||
      !formState.teamA.trim() ||
      !formState.teamB.trim()
    ) {
      setFormError("Add a title, teams, and court for this match.");
      return;
    }
    if (end <= start) {
      setFormError("End time must be after start time.");
      return;
    }

    setActionId("new-match");
    const { error } = await db.from("matches").insert({
      org_id: orgId,
      resource_id: resource.id,
      service_id: service?.id ?? null,
      title: formState.title.trim(),
      team_a: formState.teamA.trim(),
      team_b: formState.teamB.trim(),
      match_type: formState.matchType,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: formState.status,
      score: formState.score.trim() || null,
      participant_count: Math.max(
        0,
        Number.parseInt(formState.participantCount, 10) || 0,
      ),
      participant_capacity: Math.max(
        1,
        Number.parseInt(formState.participantCapacity, 10) || 1,
      ),
      notes: formState.notes.trim() || null,
    });
    setActionId(null);

    if (error) {
      setFormError(error.message);
      return;
    }

    setNewDialogOpen(false);
    navigateTo(start);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Matches
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            View and manage all scheduled matches.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-semibold text-[#171a16] shadow-sm"
            onClick={() => navigateTo(new Date())}
          >
            <span className="inline-flex items-center gap-3">
              <CalendarDays className="h-4 w-4" />
              {format(weekStartValue, "MMM d")} -{" "}
              {format(addDays(weekEndValue, -1), "MMM d, yyyy")}
            </span>
          </button>
          <Button
            variant="outline"
            onClick={() => setShowFilterToolbar(!showFilterToolbar)}
          >
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openNewMatch}
          >
            <Plus />
            New match
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-4">
            <StatCard
              icon={<Trophy />}
              label="Total Matches"
              value={String(counts.total)}
              detail="Selected week"
              tone="green"
            />
            <StatCard
              icon={<CheckCircle2 />}
              label="Completed"
              value={String(counts.completed)}
              detail={`${counts.total ? Math.round((counts.completed / counts.total) * 100) : 0}% of total`}
              tone="green"
            />
            <StatCard
              icon={<Clock3 />}
              label="Upcoming"
              value={String(counts.upcoming)}
              detail={`${counts.total ? Math.round((counts.upcoming / counts.total) * 100) : 0}% of total`}
              tone="amber"
            />
            <StatCard
              icon={<XCircle />}
              label="Cancelled"
              value={String(counts.cancelled)}
              detail={`${counts.total ? Math.round((counts.cancelled / counts.total) * 100) : 0}% of total`}
              tone="red"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="border-b border-black/[0.07] px-6 pt-5">
              <div className="flex gap-8">
                {MATCH_TABS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setTab(value); setPage(1); }}
                    className={cn(
                      "border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
                      tab === value
                        ? "border-[#62c51c] text-[#171a16]"
                        : "border-transparent text-[#5f655d]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {showFilterToolbar && (
            <div className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
                <Input
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                  placeholder="Search by match name, teams or ID..."
                  className="pl-11"
                />
              </label>
              <SelectField
                value={courtFilter}
                onChange={(v) => { setCourtFilter(v); setPage(1); }}
                options={[
                  { value: "all", label: "All courts" },
                  ...resources.map((resource) => ({
                    value: resource.id,
                    label: resource.name,
                  })),
                ]}
              />
              <SelectField
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v); setPage(1); }}
                options={[
                  { value: "all", label: "All match types" },
                  ...matchTypes.map((type) => ({ value: type, label: type })),
                ]}
              />
              <SelectField
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: "all", label: "All status" },
                  ...STATUS_OPTIONS.map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Clear filters"
                onClick={() => {
                  setCourtFilter("all");
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setQuery("");
                  setPage(1);
                }}
              >
                <ListFilter />
              </Button>
            </div>
            )}

            <MatchesTable matches={paged} onSelect={setSelectedMatch} />
            <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filtered.length === 0
                  ? "No matches"
                  : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} matches`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      size="icon"
                      onClick={() => setPage(p)}
                      className={
                        p === safePage
                          ? "bg-[#11130f] text-white"
                          : "border border-black/[0.07] bg-white text-[#5f655d]"
                      }
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <MiniCalendar
            date={selectedDateValue}
            days={miniDays}
            matches={matches}
            onNavigate={navigateTo}
          />
          <StatusChart counts={counts} />
          <UpcomingMatches matches={upcoming} onSelect={setSelectedMatch} onViewAll={() => { setTab("all"); setCourtFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setQuery(""); setPage(1); }} />
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedMatch)}
        onOpenChange={() => setSelectedMatch(null)}
      >
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Match details</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <MatchDetails
              match={selectedMatch}
              actionId={actionId}
              onStatus={handleStatus}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-2xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>New match</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleNewMatch}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="match-title">Match name</Label>
              <Input
                id="match-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    title: event.target.value,
                  }))
                }
                placeholder="Open Play"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-team-a">Team A</Label>
              <Input
                id="match-team-a"
                value={formState.teamA}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    teamA: event.target.value,
                  }))
                }
                placeholder="Alex R. / John D."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-team-b">Team B</Label>
              <Input
                id="match-team-b"
                value={formState.teamB}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    teamB: event.target.value,
                  }))
                }
                placeholder="Sam K. / Mia L."
                required
              />
            </div>
            <FieldSelect
              id="match-court"
              label="Court"
              value={formState.resourceId}
              onChange={(value) =>
                setFormState((state) => ({ ...state, resourceId: value }))
              }
              options={resources.map((resource) => ({
                value: resource.id,
                label: resource.name,
              }))}
            />
            <FieldSelect
              id="match-type"
              label="Match type"
              value={formState.matchType}
              onChange={(value) =>
                setFormState((state) => ({ ...state, matchType: value }))
              }
              options={MATCH_TYPES.map((type) => ({
                value: type,
                label: type,
              }))}
            />
            <FieldSelect
              id="match-service"
              label="Related service"
              value={formState.serviceId}
              onChange={(value) =>
                setFormState((state) => ({ ...state, serviceId: value }))
              }
              options={[
                { value: "", label: "No service" },
                ...services.map((service) => ({
                  value: service.id,
                  label: service.name,
                })),
              ]}
            />
            <FieldSelect
              id="match-status"
              label="Status"
              value={formState.status}
              onChange={(value) =>
                setFormState((state) => ({
                  ...state,
                  status: value as Match["status"],
                }))
              }
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: status,
              }))}
            />
            <div className="space-y-2">
              <Label htmlFor="match-date">Date</Label>
              <Input
                id="match-date"
                type="date"
                value={formState.date}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    date: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="match-start">Start</Label>
                <Input
                  id="match-start"
                  type="time"
                  value={formState.startTime}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      startTime: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-end">End</Label>
                <Input
                  id="match-end"
                  type="time"
                  value={formState.endTime}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      endTime: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="match-count">Players joined</Label>
                <Input
                  id="match-count"
                  type="number"
                  min={0}
                  value={formState.participantCount}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      participantCount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-capacity">Capacity</Label>
                <Input
                  id="match-capacity"
                  type="number"
                  min={1}
                  value={formState.participantCapacity}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      participantCapacity: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="match-score">Score</Label>
              <Input
                id="match-score"
                value={formState.score}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    score: event.target.value,
                  }))
                }
                placeholder="11-7"
              />
            </div>
            {resources.length === 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                Add at least one active court before creating matches.
              </p>
            )}
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionId === "new-match" || resources.length === 0}
              >
                {actionId === "new-match" ? "Saving..." : "Create match"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchesTable({
  matches,
  onSelect,
}: {
  matches: Match[];
  onSelect: (match: Match) => void;
}) {
  if (matches.length === 0)
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No matches match this view.
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="px-6 py-4">Match</th>
            <th className="px-3 py-4">Teams</th>
            <th className="px-3 py-4">Court</th>
            <th className="px-3 py-4">Date & Time</th>
            <th className="px-3 py-4">Type</th>
            <th className="px-3 py-4">Status</th>
            <th className="px-3 py-4">Score</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const start = new Date(match.starts_at);
            const end = new Date(match.ends_at);
            return (
              <tr
                key={match.id}
                className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full",
                        match.status === "cancelled"
                          ? "bg-[#fde9e7] text-[#e7473e]"
                          : match.status === "completed"
                            ? "bg-[#fff2d8] text-[#c17300]"
                            : "bg-[#edf8df] text-[#3b8b18]",
                      )}
                    >
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-black">
                        {matchCode(match.id)}
                      </span>
                      <span className="mt-1 block text-xs text-[#6b7068]">
                        {match.title}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm font-semibold">
                  <p>{match.team_a}</p>
                  <p className="my-0.5 text-xs text-[#6b7068]">vs</p>
                  <p>{match.team_b}</p>
                </td>
                <td className="px-3 py-4 text-sm">
                  <p className="font-black">
                    {match.resources?.name ?? "No court"}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {match.resources?.type ?? "Surface not set"}
                  </p>
                </td>
                <td className="px-3 py-4 text-sm">
                  <p className="font-semibold">
                    {format(start, "MMM d, yyyy")}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {format(start, "h:mm a")} - {format(end, "h:mm a")}
                  </p>
                </td>
                <td className="px-3 py-4">
                  <TypePill label={match.match_type} />
                </td>
                <td className="px-3 py-4">
                  <StatusPill status={match.status} />
                </td>
                <td className="px-3 py-4 text-sm font-black">
                  {match.score || "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${matchCode(match.id)}`}
                    onClick={() => onSelect(match)}
                  >
                    <MoreHorizontal />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
  tone: "green" | "amber" | "red";
}) {
  return (
    <article className="flex min-h-32 items-center gap-5 rounded-2xl border border-black/[0.06] bg-white px-6 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full [&_svg]:h-7 [&_svg]:w-7",
          tone === "green" && "bg-[#ebf7d7] text-[#326d1e]",
          tone === "amber" && "bg-[#fff1ce] text-[#e19a12]",
          tone === "red" && "bg-[#fde7e5] text-[#e7473e]",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold text-[#1a1d18]">
          {label}
        </span>
        <span className="mt-2 block text-[28px] leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span className="mt-3 block text-xs font-semibold text-[#5f655d]">
          {detail}
        </span>
      </span>
    </article>
  );
}

function MiniCalendar({
  date,
  days,
  matches,
  onNavigate,
}: {
  date: Date;
  days: Date[];
  matches: Match[];
  onNavigate: (date: Date) => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Calendar</h2>
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate(addMonths(date, -1))}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-black">{format(date, "MMMM yyyy")}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate(addMonths(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold text-[#5d6259] uppercase">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 px-1 py-1">
        {days.map((day) => {
          const hasMatch = matches.some((match) =>
            isSameDay(new Date(match.starts_at), day),
          );
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onNavigate(day)}
              className={cn(
                "relative grid h-8 place-items-center rounded-full text-xs font-bold transition-colors",
                !isSameMonth(day, date) && "text-[#b8bbb3]",
                isSameDay(day, date)
                  ? "bg-[#7ad51f] text-white"
                  : "hover:bg-[#eff9d7]",
                isToday(day) && !isSameDay(day, date) && "text-[#4c7a10]",
              )}
            >
              {format(day, "d")}
              {hasMatch && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#62c51c]" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatusChart({
  counts,
}: {
  counts: {
    total: number;
    completed: number;
    upcoming: number;
    live: number;
    cancelled: number;
  };
}) {
  const rows = [
    ["Completed", counts.completed, "bg-[#62c51c]"],
    ["Upcoming", counts.upcoming, "bg-[#6da9ef]"],
    ["Live", counts.live, "bg-[#f0ae2b]"],
    ["Cancelled", counts.cancelled, "bg-[#ef554d]"],
  ] as const;
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Matches by status</h2>
      <div className="mt-6 flex items-center gap-5">
        <div className="grid h-28 w-28 place-items-center rounded-full border-[18px] border-[#62c51c] bg-white shadow-inner">
          <span className="text-center">
            <span className="block text-2xl font-black">{counts.total}</span>
            <span className="text-[10px] text-[#6b7068]">Total</span>
          </span>
        </div>
        <div className="flex-1 space-y-3 text-sm">
          {rows.map(([label, count, color]) => (
            <SummaryRow
              key={label}
              label={label}
              count={count}
              total={counts.total}
              color={color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function UpcomingMatches({
  matches,
  onSelect,
  onViewAll,
}: {
  matches: Match[];
  onSelect: (match: Match) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Upcoming matches</h2>
        <button
          type="button"
          className="text-xs font-bold text-[#547b14]"
          onClick={onViewAll}
        >
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {matches.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No upcoming matches yet.</p>
        ) : (
          matches.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelect(match)}
              className="grid w-full grid-cols-[64px_1fr_auto] gap-3 text-left"
            >
              <span className="text-xs text-[#6b7068]">
                {isToday(new Date(match.starts_at))
                  ? "Today"
                  : format(new Date(match.starts_at), "MMM d")}
                <br />
                {format(new Date(match.starts_at), "h:mm a")}
              </span>
              <span>
                <span className="block text-sm font-black">{match.title}</span>
                <span className="mt-1 block text-xs text-[#6b7068]">
                  {match.resources?.name ?? "No court"} ·{" "}
                  {Math.round(
                    ((new Date(match.ends_at).getTime() -
                      new Date(match.starts_at).getTime()) /
                      3600000) *
                      10,
                  ) / 10}
                  h
                </span>
              </span>
              <span className="rounded-full bg-[#eff9d7] px-2 py-1 text-xs font-black text-[#3a7c12]">
                {match.participant_count} / {match.participant_capacity}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative inline-flex h-10 min-w-36 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-4 text-xs font-bold capitalize outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#626860]" />
    </label>
  );
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="focus-visible:ring-ring/40 h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", color)} />
        {label}
      </span>
      <span className="font-black">
        {count}{" "}
        <span className="font-semibold text-[#6b7068]">
          ({total ? Math.round((count / total) * 100) : 0}%)
        </span>
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Match["status"] }) {
  const style =
    status === "completed"
      ? "bg-[#eff9d7] text-[#32740f]"
      : status === "upcoming"
        ? "bg-[#eaf3ff] text-[#1d59a8]"
        : status === "live"
          ? "bg-[#eef9df] text-[#3a7c12]"
          : "bg-[#fde9e7] text-[#d43831]";
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        style,
      )}
    >
      {status}
    </span>
  );
}

function TypePill({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const style = lower.includes("tournament")
    ? "bg-[#f0e9ff] text-[#553093]"
    : lower.includes("league")
      ? "bg-[#fff4dc] text-[#8b5a08]"
      : "bg-[#eaf3ff] text-[#1d59a8]";
  return (
    <span className={cn("rounded-lg px-3 py-1.5 text-xs font-black", style)}>
      {label}
    </span>
  );
}

function MatchDetails({
  match,
  actionId,
  onStatus,
}: {
  match: Match;
  actionId: string | null;
  onStatus: (matchId: string, status: Match["status"], score?: string) => void;
}) {
  const [score, setScore] = useState(match.score ?? "");
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#f6f7f2] p-4">
        <p className="text-lg font-black">{matchCode(match.id)}</p>
        <p className="mt-1 text-sm text-[#626860]">
          {format(new Date(match.starts_at), "MMM d, yyyy")} ·{" "}
          {format(new Date(match.starts_at), "h:mm a")} -{" "}
          {format(new Date(match.ends_at), "h:mm a")}
        </p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Match" value={match.title} />
        <Detail label="Teams" value={`${match.team_a} vs ${match.team_b}`} />
        <Detail label="Court" value={match.resources?.name ?? "No court"} />
        <Detail label="Type" value={match.match_type} />
        <Detail label="Status" value={match.status} />
        <Detail
          label="Players"
          value={`${match.participant_count} / ${match.participant_capacity}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="match-detail-score">Score</Label>
        <Input
          id="match-detail-score"
          value={score}
          onChange={(event) => setScore(event.target.value)}
          placeholder="11-7"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={match.status === status ? "default" : "outline"}
            disabled={actionId === match.id}
            onClick={() => onStatus(match.id, status, score)}
          >
            {status}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#777c73]">{label}</p>
      <p className="mt-1 font-black text-[#171a16]">{value}</p>
    </div>
  );
}
