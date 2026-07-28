"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Grid2X2,
  Plus,
  Star,
  TrendingUp,
  Trophy,
  UserRoundPlus,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export interface ChartDay {
  date: string;
  bookings: number;
  completed: number;
}

export interface CourtStat {
  name: string;
  percent: number;
  count: number;
  color: string;
}

export interface UpcomingBooking {
  date: string;
  month: string;
  title: string;
  time: string;
  court: string;
  players: string;
  status: string;
}

export interface ActivityItem {
  icon: string;
  title: string;
  detail: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  court: string;
  capacity: string;
  tone: string;
}

export interface NotifItem {
  id: string;
  title: string;
  detail: string;
  unread: boolean;
}

export interface DashboardStats {
  totalBookings: number;
  bookingsTrend: number;
  totalCustomers: number;
  customersTrend: number;
  courtUtilization: number;
  courtUtilizationTrend: number;
  totalRevenue: number;
  revenueTrend: number;
  reviewAvg: number;
  reviewCount: number;
}

export interface DashboardData {
  orgName: string;
  userDisplayName: string;
  dateRangeLabel: string;
  stats: DashboardStats;
  chartData: ChartDay[];
  courtBreakdown: CourtStat[];
  upcomingBookings: UpcomingBooking[];
  recentActivity: ActivityItem[];
  todaySchedule: ScheduleItem[];
  notifications: NotifItem[];
  orgId: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function activityIcon(icon: string, className?: string) {
  const props = { className: className ?? "h-4 w-4" };
  switch (icon) {
    case "payment":
      return <CircleDollarSign {...props} />;
    case "cancel":
      return <Clock3 {...props} />;
    case "star":
      return <Star {...props} />;
    case "wrench":
      return <Wrench {...props} />;
    default:
      return <UserRoundPlus {...props} />;
  }
}

function formatCents(cents: number): string {
  if (cents === 0) return "₱0";
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function trendStr(value: number): string {
  if (value === 0) return "no change";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}% vs last week`;
}

function toneClass(tone: string): string {
  const map: Record<string, string> = {
    green: "bg-[#eff9d8] text-[#367b20]",
    amber: "bg-[#fff5d9] text-[#ad7400]",
    blue: "bg-[#e8f1ff] text-[#2764ad]",
    neutral: "bg-[#f3f3ef] text-[#5d615b]",
  };
  return map[tone] ?? "bg-[#f3f3ef] text-[#5d615b]";
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function PickleballDashboard(props: DashboardData) {
  const [data, setData] = useState<DashboardData>(props);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateRange, setDateRange] = useState("7");
  const notifRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  // Re-fetch when date range changes
  const refreshData = useCallback(
    async (days: number) => {
      const client = supabase.current;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);
      const rangeStart = new Date(todayStart);
      rangeStart.setDate(rangeStart.getDate() - (days - 1));

      const label = `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${todayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

      // Fetch fresh chart data
      const { data: bookings } = await client
        .from("bookings")
        .select("time_range, status")
        .eq("org_id", data.orgId)
        .filter("time_range", "ov", `[${rangeStart.toISOString()},${todayEnd.toISOString()})`);

      const daysArr: ChartDay[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        daysArr.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          bookings: 0,
          completed: 0,
        });
      }

      if (bookings) {
        const lookup = new Map<string, number>();
        daysArr.forEach((_, i) => {
          const key = new Date(rangeStart);
          key.setDate(key.getDate() + i);
          lookup.set(key.toISOString().slice(0, 10), i);
        });

        for (const b of bookings as { time_range: string; status: string }[]) {
          const m = b.time_range.match(/\[([^,]+),/);
          if (!m) continue;
          const rangeStartText = m[1];
          if (!rangeStartText) continue;
          const bDate = new Date(rangeStartText.trim().replace(" ", "T").replace(/[+-]\d{2}$/, "$&:00"));
          if (Number.isNaN(bDate.getTime())) continue;
          const key = bDate.toISOString().slice(0, 10);
          const idx = lookup.get(key);
          if (idx !== undefined) {
            const day = daysArr[idx];
            if (!day) continue;
            day.bookings++;
            if (b.status === "completed") day.completed++;
          }
        }
      }

      setData((prev) => ({ ...prev, chartData: daysArr, dateRangeLabel: label }));
    },
    [data.orgId],
  );

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDateRange(val);
    refreshData(Number(val));
  };

  /* ---- display helpers ---- */
  const s = data.stats;
  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 14) return "noon";
    if (h < 17) return "afternoon";
    return "evening";
  })();

  return (
    <div className="mx-auto max-w-[1660px]">
      {/* Header */}
      <DashboardHeader
        userName={data.userDisplayName}
        timeOfDay={timeOfDay}
        dateRangeLabel={data.dateRangeLabel}
        onDateRangeChange={handleDateRangeChange}
        dateRange={dateRange}
        notifOpen={notifOpen}
        onNotifToggle={() => setNotifOpen((o) => !o)}
        notifications={data.notifications}
        notifRef={notifRef}
      />

      {/* Stat cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={CalendarCheck2}
          label="Total Bookings"
          value={String(s.totalBookings)}
          trend={trendStr(s.bookingsTrend)}
        />
        <StatCard
          icon={UsersRound}
          label="Total Customers"
          value={String(s.totalCustomers)}
          trend={s.customersTrend > 0 ? `${s.customersTrend}% vs last week` : undefined}
          note={s.totalCustomers === 0 ? "No customers yet" : undefined}
        />
        <StatCard
          icon={Grid2X2}
          label="Court Utilization"
          value={`${s.courtUtilization}%`}
          trend={s.courtUtilizationTrend > 0 ? `${s.courtUtilizationTrend}% vs last week` : undefined}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Total Revenue"
          value={formatCents(s.totalRevenue)}
          trend={trendStr(s.revenueTrend)}
        />
        <StatCard
          icon={Star}
          label="Reviews"
          value={s.reviewAvg > 0 ? String(s.reviewAvg) : "—"}
          note={
            s.reviewCount > 0
              ? `from ${s.reviewCount} review${s.reviewCount !== 1 ? "s" : ""}`
              : "No reviews yet"
          }
        />
      </section>

      {/* Charts row */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_0.92fr]">
        <BookingsOverview chartData={data.chartData} dateRange={dateRange} onRangeChange={handleDateRangeChange} />
        <CourtBookings breakdown={data.courtBreakdown} total={s.totalBookings} />
      </section>

      {/* Bottom widgets */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.84fr_1.02fr]">
        <UpcomingBookings bookings={data.upcomingBookings} />
        <RecentActivity items={data.recentActivity} />
        <TodaysSchedule items={data.todaySchedule} />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function DashboardHeader({
  userName,
  timeOfDay,
  dateRangeLabel,
  onDateRangeChange,
  dateRange,
  notifOpen,
  onNotifToggle,
  notifications,
  notifRef,
}: {
  userName: string;
  timeOfDay: string;
  dateRangeLabel: string;
  onDateRangeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  dateRange: string;
  notifOpen: boolean;
  onNotifToggle: () => void;
  notifications: NotifItem[];
  notifRef: React.RefObject<HTMLDivElement | null>;
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-[-0.045em] text-[#151713]">
          Good {timeOfDay}, {userName}!
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Here&apos;s what&apos;s happening with your pickleball bookings today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Date range selector */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#151713]" />
          <select
            aria-label="Change dashboard date range"
            value={dateRange}
            onChange={onDateRangeChange}
            className="relative flex h-11 cursor-pointer appearance-none items-center rounded-xl border border-black/[0.09] bg-white pl-10 pr-9 text-xs font-bold shadow-[0_4px_16px_rgba(23,26,22,0.04)] transition-colors hover:border-black/20 focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          </span>
        </div>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={onNotifToggle}
            className="relative grid h-11 w-11 place-items-center rounded-xl text-[#151713] transition-colors hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
            aria-label={`Open notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#fbfaf4] bg-[#6abd00] px-1 text-[8px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-black/[0.07] bg-white shadow-[0_12px_40px_rgba(23,26,22,0.12)]">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
                <span className="text-xs font-black">Notifications</span>
                <button
                  type="button"
                  onClick={onNotifToggle}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-6 text-center text-xs">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-black/[0.04] px-4 py-3 ${
                        n.unread ? "bg-[#f8fce8]" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{n.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">{n.detail}</p>
                      </div>
                      {n.unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6abd00]" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/bookings"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#151713] px-5 text-xs font-bold text-white shadow-[0_8px_22px_rgba(23,26,22,0.18)] transition-all hover:-translate-y-0.5 hover:bg-black focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" />
          New booking
        </Link>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  note,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  trend?: string;
  note?: string;
}) {
  return (
    <article className="flex min-h-32 items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-3.5 shadow-[0_8px_26px_rgba(23,26,22,0.035)]">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f1f9df] text-[#317b20]">
        <Icon className="h-6 w-6" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#4e534d]">{label}</p>
        <p className="mt-1 text-[1.5rem] leading-none font-black tracking-[-0.035em] text-[#151713]">
          {value}
        </p>
        {trend ? (
          <p className="text-muted-foreground mt-2 flex items-center gap-1 text-[10px]">
            {trend !== "no change" && trend?.startsWith("+") && (
              <TrendingUp className="h-3 w-3 text-[#5aaa00]" />
            )}
            {trend !== "no change" && trend?.startsWith("-") && (
              <TrendingUp className="h-3 w-3 rotate-180 text-[#f25d43]" />
            )}
            {trend}
          </p>
        ) : note ? (
          <p className="text-muted-foreground mt-2 text-[10px]">{note}</p>
        ) : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bookings overview (chart)                                                 */
/* -------------------------------------------------------------------------- */

function BookingsOverview({ chartData, dateRange, onRangeChange }: { chartData: ChartDay[]; dateRange: string; onRangeChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }) {
  const maxVal = Math.max(1, ...chartData.map((d) => d.bookings));
  const chartHeight = 208;
  const chartWidth = 700;
  const plotLeft = 48;
  const plotRight = 700;
  const plotWidth = plotRight - plotLeft;
  const step = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth;

  return (
    <section className="min-w-0 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_26px_rgba(23,26,22,0.035)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-black tracking-[-0.02em]">Bookings overview</h2>
        <label className="sr-only" htmlFor="chart-range">
          Chart range
        </label>
        <select
          id="chart-range"
          className="h-9 rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
          value={dateRange}
          onChange={onRangeChange}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="mt-4 flex items-center gap-5 text-[11px] text-[#444942]">
        <span className="flex items-center gap-2">
          <i className="h-0.5 w-5 bg-[#65bd00]" /> Bookings
        </span>
        <span className="flex items-center gap-2">
          <i className="w-5 border-t border-dashed border-[#a9aca7]" /> Completed
        </span>
      </div>

      <figure
        className="mt-2 overflow-x-auto"
        aria-label="Bookings and completed sessions over time"
      >
        <svg
          viewBox="0 0 720 250"
          className="w-full min-w-[580px] xl:min-w-0"
          role="img"
          aria-labelledby="booking-chart-title"
        >
          <title id="booking-chart-title">Bookings overview</title>
          <defs>
            <linearGradient id="booking-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b9f34b" stopOpacity="0.23" />
              <stop offset="100%" stopColor="#b9f34b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = chartHeight - (value / 100) * chartHeight - 10;
            return (
              <g key={value}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#ecece7" />
                <text x="12" y={y + 4} fontSize="11" fill="#666b64">
                  {Math.round((value / 100) * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {chartData.length > 0 && (
            <path
              d={`M ${chartData
                .map((d, i) => {
                  const x = plotLeft + i * step;
                  const y = chartHeight - ((d.bookings / maxVal) * (chartHeight - 20)) - 10;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")} L ${plotRight} ${chartHeight - 10} L ${plotLeft} ${chartHeight - 10} Z`}
              fill="url(#booking-area)"
            />
          )}

          {/* Bookings line */}
          {chartData.length > 0 && (
            <polyline
              points={chartData
                .map((d, i) => {
                  const x = plotLeft + i * step;
                  const y = chartHeight - ((d.bookings / maxVal) * (chartHeight - 20)) - 10;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#65bd00"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Completed line (dashed) */}
          {chartData.length > 0 && (
            <polyline
              points={chartData
                .map((d, i) => {
                  const x = plotLeft + i * step;
                  const y = chartHeight - ((d.completed / maxVal) * (chartHeight - 20)) - 10;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#b1b4af"
              strokeWidth="1.6"
              strokeDasharray="7 5"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {chartData.map((d, i) => {
            const x = plotLeft + i * step;
            const y = chartHeight - ((d.bookings / maxVal) * (chartHeight - 20)) - 10;
            return (
              <circle key={`b-${i}`} cx={x} cy={y} r="4.5" fill="#65bd00">
                <title>{`${d.date}: ${d.bookings} bookings`}</title>
              </circle>
            );
          })}
          {chartData.map((d, i) => {
            const x = plotLeft + i * step;
            const y = chartHeight - ((d.completed / maxVal) * (chartHeight - 20)) - 10;
            return d.completed > 0 ? (
              <circle key={`c-${i}`} cx={x} cy={y} r="3.5" fill="#b1b4af" />
            ) : null;
          })}

          {/* X-axis labels */}
          {chartData.map((d, i) => (
            <text
              key={d.date}
              x={plotLeft + i * step}
              y="236"
              textAnchor={i === 0 ? "start" : i === chartData.length - 1 ? "end" : "middle"}
              fontSize="10.5"
              fill="#666b64"
            >
              {d.date}
            </text>
          ))}
        </svg>
      </figure>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bookings by court (donut)                                                 */
/* -------------------------------------------------------------------------- */

function CourtBookings({
  breakdown,
  total,
}: {
  breakdown: CourtStat[];
  total: number;
}) {
  const hasData = total > 0 && breakdown.some((c) => c.count > 0);
  const conic = breakdown
    .filter((c) => c.percent > 0)
    .map((c) => `${c.color} 0 ${c.percent}%`)
    .join(", ");

  return (
    <section className="min-w-0 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_26px_rgba(23,26,22,0.035)] sm:p-6">
      <h2 className="text-base font-black tracking-[-0.02em]">Bookings by court</h2>

      {!hasData ? (
        <div className="mt-5 flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground text-xs">No booking data yet</p>
        </div>
      ) : (
        <div className="mt-5 grid items-center gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
          <div className="relative mx-auto h-44 w-44">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: `conic-gradient(${conic || "#e9e8e2 0 100%"})`,
              }}
              role="img"
              aria-label={`Court booking distribution: ${breakdown
                .filter((c) => c.percent > 0)
                .map((c) => `${c.name} ${c.percent}%`)
                .join(", ")}`}
            />
            <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-3xl font-black tracking-[-0.045em]">{total}</p>
                <p className="text-muted-foreground text-[10px]">Total</p>
              </div>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-2 flex justify-between text-[9px] font-bold tracking-wider uppercase">
              <span>Court</span>
              <span>Bookings</span>
            </div>
            {breakdown.map((court) => (
              <div
                key={court.name}
                className="flex items-center border-b border-black/[0.06] py-2.5 last:border-0"
              >
                <span
                  className="mr-2.5 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: court.color }}
                />
                <span className="text-xs font-semibold">{court.name}</span>
                <span className="ml-auto text-xs text-[#50554e]">
                  <span className="whitespace-nowrap">
                    {court.percent}% ({court.count})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/reports"
        className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#f6f6f2] text-[11px] font-bold transition-colors hover:bg-[#efefe9] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
      >
        View full report <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Upcoming bookings                                                         */
/* -------------------------------------------------------------------------- */

function UpcomingBookings({ bookings }: { bookings: UpcomingBooking[] }) {
  return (
    <DashboardListCard title="Upcoming bookings" action="View all" href="/dashboard/bookings">
      {bookings.length === 0 ? (
        <p className="text-muted-foreground mt-4 py-4 text-center text-xs">No upcoming bookings</p>
      ) : (
        <div className="mt-2">
          {bookings.map((booking, index) => (
            <article
              key={`${booking.date}-${booking.title}`}
              className="grid grid-cols-[42px_34px_minmax(0,1fr)] items-center gap-2.5 border-b border-black/[0.06] py-2.5 last:border-0"
            >
              <div className="rounded-lg border border-black/[0.08] bg-[#fafaf7] py-1 text-center shadow-sm">
                <span className="text-muted-foreground block text-[8px] font-bold">
                  {booking.month}
                </span>
                <span className="block text-base leading-tight font-black">{booking.date}</span>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f9df] text-[#347e20]">
                {index === 1 ? (
                  <Trophy className="h-3.5 w-3.5" />
                ) : (
                  <UsersRound className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{booking.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                    {booking.time} · {booking.court}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                      booking.status === "Confirmed"
                        ? "bg-[#eff9d8] text-[#367b20]"
                        : "bg-[#e8f1ff] text-[#2764ad]"
                    }`}
                  >
                    {booking.status}
                  </span>
                  <p className="text-muted-foreground mt-1 text-[9px]">{booking.players}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardListCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recent activity                                                           */
/* -------------------------------------------------------------------------- */

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <DashboardListCard title="Recent activity" action="View all" href="/dashboard/reports">
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-4 py-4 text-center text-xs">No recent activity</p>
      ) : (
        <div className="mt-2 space-y-1">
          {items.map((activity) => (
            <article key={activity.title} className="flex items-center gap-3 py-2">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  activity.icon === "cancel"
                    ? "bg-[#fff0ec] text-[#f25d43]"
                    : "bg-[#f1f9df] text-[#347e20]"
                }`}
              >
                {activityIcon(activity.icon)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{activity.title}</p>
                <p
                  className={`mt-0.5 truncate text-[10px] ${
                    activity.icon === "star" ? "text-[#e8a400]" : "text-muted-foreground"
                  }`}
                >
                  {activity.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardListCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Today's schedule                                                          */
/* -------------------------------------------------------------------------- */

function TodaysSchedule({ items }: { items: ScheduleItem[] }) {
  return (
    <DashboardListCard title="Today's schedule" action="View calendar" href="/dashboard/calendar">
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-4 py-4 text-center text-xs">No sessions scheduled today</p>
      ) : (
        <ol className="mt-3">
          {items.map((session, index) => (
            <li
              key={`${session.time}-${session.title}`}
              className="relative grid grid-cols-[60px_14px_minmax(0,1fr)_42px] items-start gap-2 py-2"
            >
              {index < items.length - 1 && (
                <span className="absolute top-5 bottom-[-8px] left-[66px] w-px border-l border-dashed border-black/20" />
              )}
              <span className="text-muted-foreground pt-0.5 text-[10px]">{session.time}</span>
              <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-[#66bd00] ring-4 ring-white" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{session.title}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">{session.court}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-center text-[9px] font-bold ${toneClass(session.tone)}`}
              >
                {session.capacity}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardListCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared card wrapper                                                       */
/* -------------------------------------------------------------------------- */

function DashboardListCard({
  title,
  action,
  href,
  children,
}: {
  title: string;
  action: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_26px_rgba(23,26,22,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black tracking-[-0.02em]">{title}</h2>
        <Link
          href={href}
          className="text-[10px] font-bold text-[#315f25] hover:underline focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
        >
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

export function PickleballDashboardSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="pinwheel" size={40} className="text-[#c8a876]" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    </div>
  );
}
