"use client";

import { addDays, format, isAfter, subDays } from "date-fns";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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

type Player = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skill_level: number;
  play_style: string;
  status: "active" | "inactive";
  birthday: string | null;
  notes: string | null;
  created_at: string;
};

type MatchStat = {
  id: string;
  player_id: string;
  result: "win" | "loss" | "draw" | null;
  matches: { id: string; starts_at: string; status: string } | null;
};

type PlayerMetric = {
  player: Player;
  totalMatches: number;
  wins: number;
  winRate: number;
  skillLabel: string;
};

type FormState = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  skillLevel: string;
  playStyle: string;
  status: Player["status"];
  birthday: string;
  notes: string;
};

const PLAYER_TABS = [
  ["all", "All Players"],
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["skill", "By Skill Level"],
] as const;

const PLAY_STYLES = [
  "All Court Player",
  "Aggressive Baseliner",
  "Counter Puncher",
  "Control Player",
  "Power Player",
  "Defensive Player",
  "Consistent Player",
];

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function playerCode(id: string) {
  return `#PLY-${
    id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() || "00000"
  }`;
}

function initials(name?: string | null) {
  return (name ?? "Player")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function skillLabel(level: number) {
  if (level >= 4.5) return "Advanced";
  if (level >= 3.5) return "Intermediate";
  if (level >= 3) return "Advanced Beginner";
  if (level >= 2.5) return "Upper Beginner";
  return "Beginner";
}

function metricFor(player: Player, stats: MatchStat[]): PlayerMetric {
  const rows = stats.filter((stat) => stat.player_id === player.id);
  const wins = rows.filter((stat) => stat.result === "win").length;
  const totalMatches = rows.length;
  return {
    player,
    totalMatches,
    wins,
    winRate: totalMatches ? Math.round((wins / totalMatches) * 100) : 0,
    skillLabel: skillLabel(Number(player.skill_level)),
  };
}

function formDefaults(player: Player | null): FormState {
  return {
    id: player?.id ?? null,
    name: player?.name ?? "",
    email: player?.email ?? "",
    phone: player?.phone ?? "",
    skillLevel: String(player?.skill_level ?? 3),
    playStyle: player?.play_style ?? PLAY_STYLES[0]!,
    status: player?.status ?? "active",
    birthday: player?.birthday ?? "",
    notes: player?.notes ?? "",
  };
}

export function PlayersView({
  orgId,
  players,
  matchStats,
  selectedDate,
  weekStart,
  weekEnd,
}: {
  orgId: string;
  players: Player[];
  matchStats: MatchStat[];
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
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(() =>
    formDefaults(null),
  );

  const metrics = useMemo(
    () => players.map((player) => metricFor(player, matchStats)),
    [players, matchStats],
  );
  const activeCount = players.filter(
    (player) => player.status === "active",
  ).length;
  const newCount = players.filter((player) =>
    isAfter(new Date(player.created_at), subDays(new Date(), 30)),
  ).length;
  const avgSkill = players.length
    ? players.reduce((sum, player) => sum + Number(player.skill_level), 0) /
      players.length
    : 0;
  const topPlayers = metrics
    .slice()
    .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches)
    .slice(0, 5);
  const birthdays = players
    .filter((player) => player.birthday)
    .slice()
    .sort((a, b) => String(a.birthday).localeCompare(String(b.birthday)))
    .slice(0, 4);

  const filtered = metrics.filter((item) => {
    const player = item.player;
    const haystack =
      `${player.name} ${player.email ?? ""} ${player.phone ?? ""} ${player.play_style}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesTab =
      tab === "all" || (tab === "skill" ? true : player.status === tab);
    const matchesSkill =
      skillFilter === "all" || item.skillLabel === skillFilter;
    const matchesStatus =
      statusFilter === "all" || player.status === statusFilter;
    return matchesQuery && matchesTab && matchesSkill && matchesStatus;
  });
  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function navigateTo(date: Date) {
    router.push(`/dashboard/players?date=${dateParam(date)}`);
  }

  function openAddDialog() {
    setFormError(null);
    setFormState(formDefaults(null));
    setDialogOpen(true);
  }

  function openEditDialog(player: Player) {
    setFormError(null);
    setSelectedPlayer(player);
    setFormState(formDefaults(player));
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      org_id: orgId,
      name: formState.name.trim(),
      email: formState.email.trim() || null,
      phone: formState.phone.trim() || null,
      skill_level: Number.parseFloat(formState.skillLevel) || 3,
      play_style: formState.playStyle,
      status: formState.status,
      birthday: formState.birthday || null,
      notes: formState.notes.trim() || null,
    };
    const { error } = formState.id
      ? await db.from("players").update(payload).eq("id", formState.id)
      : await db.from("players").insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Players
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Manage players, skill levels and performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 min-w-64 items-center justify-between rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-semibold text-[#171a16] shadow-sm"
            onClick={() => navigateTo(selectedDateValue)}
          >
            <span className="inline-flex items-center gap-3">
              <CalendarDays className="h-4 w-4" />
              {format(weekStartValue, "MMM d")} -{" "}
              {format(addDays(weekEndValue, -1), "MMM d, yyyy")}
            </span>
            <ChevronDown className="h-4 w-4 text-[#696e65]" />
          </button>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openAddDialog}
          >
            <Plus />
            Add player
          </Button>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={<UsersRound />}
          label="Total Players"
          value={String(players.length)}
          detail="All players"
          tone="green"
        />
        <StatCard
          icon={<Activity />}
          label="Active Players"
          value={String(activeCount)}
          detail={`${players.length ? Math.round((activeCount / players.length) * 100) : 0}% of total`}
          tone="green"
        />
        <StatCard
          icon={<Star />}
          label="New This Month"
          value={String(newCount)}
          detail="Last 30 days"
          tone="amber"
        />
        <StatCard
          icon={<Trophy />}
          label="Avg. Skill Level"
          value={avgSkill ? avgSkill.toFixed(1) : "0.0"}
          detail={avgSkill ? skillLabel(avgSkill) : "No players yet"}
          tone="purple"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="border-b border-black/[0.07] px-6 pt-5">
            <div className="flex gap-8">
              {PLAYER_TABS.map(([value, label]) => (
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

          <div className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
              <Input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder="Search by name, email or phone..."
                className="pl-11"
              />
            </label>
            {showFilters && (
              <>
                <SelectField
                  value={skillFilter}
                  onChange={(val) => { setSkillFilter(val); setPage(1); }}
                  options={[
                    { value: "all", label: "All skill levels" },
                    ...[
                      "Beginner",
                      "Upper Beginner",
                      "Advanced Beginner",
                      "Intermediate",
                      "Advanced",
                    ].map((label) => ({ value: label, label })),
                  ]}
                />
                <SelectField
                  value={statusFilter}
                  onChange={(val) => { setStatusFilter(val); setPage(1); }}
                  options={[
                    { value: "all", label: "All status" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
                <Button variant="outline" size="icon" aria-label="View options" onClick={() => { setSkillFilter("all"); setStatusFilter("all"); setPage(1); }}>
                  <ListFilter />
                </Button>
              </>
            )}
          </div>

          <PlayersTable
            players={paged}
            selectedIds={selectedIds}
            onToggle={(id) =>
              setSelectedIds((ids) =>
                ids.includes(id)
                  ? ids.filter((item) => item !== id)
                  : [...ids, id],
              )
            }
            onSelect={setSelectedPlayer}
            onEdit={openEditDialog}
          />
          <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} players
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pages: number[] = [];
                const start = Math.max(1, safePage - 2);
                const end = Math.min(totalPages, start + 4);
                for (let p = start; p <= end; p++) pages.push(p);
                return pages[i];
              }).filter((p): p is number => p !== undefined).map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "outline"}
                  size="icon"
                  className={p === safePage ? "bg-[#11130f] text-white" : ""}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <SkillDistribution players={players} />
          <TopPlayers players={topPlayers} onSelect={setSelectedPlayer} onViewAll={() => { setTab("all"); setSkillFilter("all"); setStatusFilter("all"); setPage(1); }} />
          <Birthdays players={birthdays} onSelect={setSelectedPlayer} onViewAll={() => { setTab("all"); setSkillFilter("all"); setStatusFilter("all"); setPage(1); }} />
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedPlayer)}
        onOpenChange={() => setSelectedPlayer(null)}
      >
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Player details</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <PlayerDetails
              metric={metricFor(selectedPlayer, matchStats)}
              onEdit={() => openEditDialog(selectedPlayer)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {formState.id ? "Edit player" : "Add player"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="player-name">Player name</Label>
              <Input
                id="player-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                placeholder="Alex Rivera"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-email">Email</Label>
              <Input
                id="player-email"
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    email: event.target.value,
                  }))
                }
                placeholder="alex@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-phone">Phone</Label>
              <Input
                id="player-phone"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    phone: event.target.value,
                  }))
                }
                placeholder="+1 555-123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-skill">Skill level</Label>
              <Input
                id="player-skill"
                type="number"
                min={1}
                max={5}
                step={0.5}
                value={formState.skillLevel}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    skillLevel: event.target.value,
                  }))
                }
                required
              />
            </div>
            <FieldSelect
              id="player-style"
              label="Play style"
              value={formState.playStyle}
              onChange={(value) =>
                setFormState((state) => ({ ...state, playStyle: value }))
              }
              options={PLAY_STYLES.map((style) => ({
                value: style,
                label: style,
              }))}
            />
            <FieldSelect
              id="player-status"
              label="Status"
              value={formState.status}
              onChange={(value) =>
                setFormState((state) => ({
                  ...state,
                  status: value as Player["status"],
                }))
              }
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <div className="space-y-2">
              <Label htmlFor="player-birthday">Birthday</Label>
              <Input
                id="player-birthday"
                type="date"
                value={formState.birthday}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    birthday: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="player-notes">Notes</Label>
              <Input
                id="player-notes"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    notes: event.target.value,
                  }))
                }
                placeholder="Preferred partner, league notes, etc."
              />
            </div>
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : formState.id
                    ? "Save changes"
                    : "Add player"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayersTable({
  players,
  selectedIds,
  onToggle,
  onSelect,
  onEdit,
}: {
  players: PlayerMetric[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (player: Player) => void;
  onEdit: (player: Player) => void;
}) {
  if (players.length === 0)
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No players match this view.
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="w-12 px-6 py-4">
              <span className="block h-4 w-4 rounded border border-black/15" />
            </th>
            <th className="px-2 py-4">Player</th>
            <th className="px-2 py-4">Contact</th>
            <th className="px-2 py-4">Skill level</th>
            <th className="px-2 py-4">Play style</th>
            <th className="px-2 py-4">Total matches</th>
            <th className="px-2 py-4">Win rate</th>
            <th className="px-2 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((item) => (
            <tr
              key={item.player.id}
              className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
            >
              <td className="px-6 py-4">
                <input
                  aria-label={`Select ${item.player.name}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                  checked={selectedIds.includes(item.player.id)}
                  onChange={() => onToggle(item.player.id)}
                />
              </td>
              <td className="px-2 py-4">
                <button
                  type="button"
                  onClick={() => onSelect(item.player)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar name={item.player.name} />
                  <span>
                    <span className="block text-sm font-black">
                      {item.player.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#6b7068]">
                      {playerCode(item.player.id)}
                    </span>
                  </span>
                </button>
              </td>
              <td className="px-2 py-4 text-sm">
                <p className="font-semibold">
                  {item.player.email ?? "No email"}
                </p>
                <p className="mt-1 text-xs text-[#6b7068]">
                  {item.player.phone ?? "No phone"}
                </p>
              </td>
              <td className="px-2 py-4">
                <span className="mr-2 rounded-lg bg-[#eff9d7] px-3 py-1.5 text-sm font-black">
                  {Number(item.player.skill_level).toFixed(1)}
                </span>
                <span className="text-xs font-semibold">{item.skillLabel}</span>
              </td>
              <td className="px-2 py-4 text-sm font-semibold">
                {item.player.play_style}
              </td>
              <td className="px-2 py-4 text-sm font-black">
                {item.totalMatches}
              </td>
              <td className="px-2 py-4">
                <WinRate value={item.winRate} />
              </td>
              <td className="px-2 py-4">
                <StatusPill status={item.player.status} />
              </td>
              <td className="px-6 py-4 text-right">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Edit ${item.player.name}`}
                  onClick={() => onEdit(item.player)}
                >
                  <MoreHorizontal />
                </Button>
              </td>
            </tr>
          ))}
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
  tone: "green" | "amber" | "purple";
}) {
  return (
    <article className="flex min-h-32 items-center gap-5 rounded-2xl border border-black/[0.06] bg-white px-6 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full [&_svg]:h-7 [&_svg]:w-7",
          tone === "green" && "bg-[#ebf7d7] text-[#326d1e]",
          tone === "amber" && "bg-[#fff1ce] text-[#e19a12]",
          tone === "purple" && "bg-[#efe5ff] text-[#7c45d8]",
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
    <label className="relative inline-flex h-10 min-w-44 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-4 text-xs font-bold outline-none"
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

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1f241e] text-[10px] font-black text-white">
      {initials(name)}
    </span>
  );
}

function StatusPill({ status }: { status: Player["status"] }) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        status === "active"
          ? "bg-[#eff9d7] text-[#32740f]"
          : "bg-[#f4f3ef] text-[#5f655d]",
      )}
    >
      {status}
    </span>
  );
}

function WinRate({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-sm font-black">{value}%</span>
      <span className="h-1.5 w-20 rounded-full bg-[#e6e5de]">
        <span
          className={cn(
            "block h-full rounded-full",
            value >= 50 ? "bg-[#62c51c]" : "bg-[#ef554d]",
          )}
          style={{ width: `${value}%` }}
        />
      </span>
    </div>
  );
}

function SkillDistribution({ players }: { players: Player[] }) {
  const rows = [
    "Beginner",
    "Upper Beginner",
    "Advanced Beginner",
    "Intermediate",
    "Advanced",
  ].map((label) => ({
    label,
    count: players.filter(
      (player) => skillLabel(Number(player.skill_level)) === label,
    ).length,
  }));
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Skill level distribution</h2>
      <div className="mt-6 flex items-center gap-5">
        <div className="grid h-28 w-28 place-items-center rounded-full border-[18px] border-[#62c51c] bg-white shadow-inner">
          <span className="text-center">
            <span className="block text-2xl font-black">{players.length}</span>
            <span className="text-[10px] text-[#6b7068]">Total</span>
          </span>
        </div>
        <div className="flex-1 space-y-3 text-sm">
          {rows.map((row, index) => (
            <SummaryRow
              key={row.label}
              label={row.label}
              count={row.count}
              total={players.length}
              color={
                [
                  "bg-[#ef554d]",
                  "bg-[#f0ae2b]",
                  "bg-[#62c51c]",
                  "bg-[#5b9fe8]",
                  "bg-[#8e62d9]",
                ][index] ?? "bg-[#62c51c]"
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TopPlayers({
  players,
  onSelect,
  onViewAll,
}: {
  players: PlayerMetric[];
  onSelect: (player: Player) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Top players</h2>
        <button type="button" onClick={onViewAll} className="text-xs font-bold text-[#547b14]">
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {players.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No match results yet.</p>
        ) : (
          players.map((item) => (
            <button
              key={item.player.id}
              type="button"
              onClick={() => onSelect(item.player)}
              className="grid w-full grid-cols-[36px_1fr_88px] items-center gap-3 text-left"
            >
              <Avatar name={item.player.name} />
              <span>
                <span className="block text-sm font-black">
                  {item.player.name}
                </span>
                <span className="mt-1 block text-xs text-[#6b7068]">
                  {item.totalMatches} matches
                </span>
              </span>
              <WinRate value={item.winRate} />
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function Birthdays({
  players,
  onSelect,
  onViewAll,
}: {
  players: Player[];
  onSelect: (player: Player) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Upcoming birthdays</h2>
        <button type="button" onClick={onViewAll} className="text-xs font-bold text-[#547b14]">
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {players.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No birthdays saved yet.</p>
        ) : (
          players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelect(player)}
              className="flex w-full items-center gap-3 text-left"
            >
              <Avatar name={player.name} />
              <span>
                <span className="block text-sm font-black">{player.name}</span>
                <span className="mt-1 block text-xs text-[#6b7068]">
                  {player.birthday
                    ? format(
                        new Date(`${player.birthday}T12:00:00`),
                        "MMM d, yyyy",
                      )
                    : ""}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
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

function PlayerDetails({
  metric,
  onEdit,
}: {
  metric: PlayerMetric;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-[#f6f7f2] p-4">
        <Avatar name={metric.player.name} />
        <span>
          <p className="text-lg font-black">{metric.player.name}</p>
          <p className="mt-1 text-sm text-[#626860]">
            {playerCode(metric.player.id)}
          </p>
        </span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Email" value={metric.player.email ?? "No email"} />
        <Detail label="Phone" value={metric.player.phone ?? "No phone"} />
        <Detail
          label="Skill"
          value={`${Number(metric.player.skill_level).toFixed(1)} · ${metric.skillLabel}`}
        />
        <Detail label="Play style" value={metric.player.play_style} />
        <Detail label="Matches" value={String(metric.totalMatches)} />
        <Detail label="Win rate" value={`${metric.winRate}%`} />
      </div>
      {metric.player.notes && (
        <div>
          <p className="text-xs font-bold text-[#777c73]">Notes</p>
          <p className="mt-1 text-sm text-[#171a16]">{metric.player.notes}</p>
        </div>
      )}
      <Button onClick={onEdit}>Edit player</Button>
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
