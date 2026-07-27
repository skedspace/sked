"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

const BOOKINGS_SERIES = [43, 58, 78, 63, 61, 75, 87];
const COMPLETED_SERIES = [16, 29, 25, 35, 25, 38, 34];
const CHART_DATES = [
  "Jun 9",
  "Jun 10",
  "Jun 11",
  "Jun 12",
  "Jun 13",
  "Jun 14",
  "Jun 15",
];

const COURTS = [
  { name: "Court 1", percent: 32, count: 41, color: "#69bf00" },
  { name: "Court 2", percent: 24, count: 31, color: "#b9ea0f" },
  { name: "Court 3", percent: 18, count: 23, color: "#ffb80e" },
  { name: "Court 4", percent: 14, count: 18, color: "#ff684e" },
  { name: "Court 5", percent: 12, count: 15, color: "#e9e8e2" },
];

const UPCOMING_BOOKINGS = [
  {
    date: "17",
    title: "Intermediate Doubles",
    time: "9:00 AM – 10:00 AM",
    court: "Court 1",
    players: "4 / 4 players",
    status: "Confirmed",
  },
  {
    date: "17",
    title: "Private Coaching",
    time: "11:00 AM – 12:00 PM",
    court: "Court 2",
    players: "1 / 1 player",
    status: "Confirmed",
  },
  {
    date: "17",
    title: "Advanced Mixed Doubles",
    time: "4:00 PM – 5:30 PM",
    court: "Court 3",
    players: "4 / 4 players",
    status: "Confirmed",
  },
  {
    date: "18",
    title: "Beginner Social Play",
    time: "6:00 PM – 7:00 PM",
    court: "Court 4",
    players: "2 / 4 players",
    status: "Pending",
  },
];

const RECENT_ACTIVITY = [
  {
    icon: UserRoundPlus,
    tone: "lime",
    title: "New booking by Alex R.",
    detail: "Court 1 · Jun 16, 10:32 AM",
  },
  {
    icon: CircleDollarSign,
    tone: "lime",
    title: "Payment received",
    detail: "₱850.00 from John D.",
  },
  {
    icon: Clock3,
    tone: "coral",
    title: "Booking cancelled",
    detail: "Court 3 · Jun 16, 9:15 AM",
  },
  {
    icon: Star,
    tone: "lime",
    title: "New review received",
    detail: "★★★★★ from Sam K.",
  },
  {
    icon: Wrench,
    tone: "lime",
    title: "Court 2 maintenance scheduled",
    detail: "Jun 20, 2026",
  },
];

const TODAY_SCHEDULE = [
  {
    time: "9:00 AM",
    title: "Intermediate Doubles",
    court: "Court 1",
    capacity: "4 / 4",
    tone: "green",
  },
  {
    time: "10:00 AM",
    title: "Open Play",
    court: "Court 5",
    capacity: "3 / 8",
    tone: "amber",
  },
  {
    time: "11:00 AM",
    title: "Private Coaching",
    court: "Court 2",
    capacity: "1 / 1",
    tone: "green",
  },
  {
    time: "1:00 PM",
    title: "Lunch Break",
    court: "—",
    capacity: "—",
    tone: "neutral",
  },
  {
    time: "4:00 PM",
    title: "Advanced Mixed Doubles",
    court: "Court 3",
    capacity: "4 / 4",
    tone: "green",
  },
  {
    time: "6:00 PM",
    title: "Beginner Social Play",
    court: "Court 4",
    capacity: "2 / 4",
    tone: "blue",
  },
];

export function PickleballDashboard() {
  return (
    <div className="mx-auto max-w-[1660px]">
      <DashboardHeader />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={CalendarCheck2}
          label="Total Bookings"
          value="128"
          trend="12.4% vs last week"
        />
        <StatCard
          icon={UsersRound}
          label="Total Customers"
          value="320"
          trend="8.1% vs last week"
        />
        <StatCard
          icon={Grid2X2}
          label="Court Bookings"
          value="86%"
          trend="3.6% vs last week"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Total Revenue"
          value="₱84,500"
          trend="15.7% vs last week"
        />
        <StatCard
          icon={Star}
          label="Reviews"
          value="4.9"
          note="from 124 reviews"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_0.92fr]">
        <BookingsOverview />
        <CourtBookings />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.84fr_1.02fr]">
        <UpcomingBookings />
        <RecentActivity />
        <TodaysSchedule />
      </section>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-[-0.045em] text-[#151713]">
          Good morning, Maya! <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Here&apos;s what&apos;s happening with your pickleball bookings today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="flex h-11 items-center gap-3 rounded-xl border border-black/[0.09] bg-white px-4 text-xs font-bold shadow-[0_4px_16px_rgba(23,26,22,0.04)] transition-colors hover:border-black/20 focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
          aria-label="Change dashboard date range"
        >
          <CalendarDays className="h-4 w-4" />
          Jun 9 – Jun 15, 2026
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-xl text-[#151713] transition-colors hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full border-2 border-[#fbfaf4] bg-[#6abd00]" />
        </button>

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
            <TrendingUp className="h-3 w-3 text-[#5aaa00]" />
            {trend}
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-[10px]">{note}</p>
        )}
      </div>
    </article>
  );
}

function BookingsOverview() {
  const bookingPoints = toChartPoints(BOOKINGS_SERIES);
  const completedPoints = toChartPoints(COMPLETED_SERIES);

  return (
    <section className="min-w-0 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_26px_rgba(23,26,22,0.035)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-black tracking-[-0.02em]">
          Bookings overview
        </h2>
        <label className="sr-only" htmlFor="chart-range">
          Chart range
        </label>
        <select
          id="chart-range"
          className="h-9 rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
          defaultValue="7"
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
          <i className="w-5 border-t border-dashed border-[#a9aca7]" />{" "}
          Completed
        </span>
      </div>

      <figure
        className="mt-2 overflow-x-auto"
        aria-label="Bookings and completed sessions over seven days"
      >
        <svg
          viewBox="0 0 720 250"
          className="w-full min-w-[580px] xl:min-w-0"
          role="img"
          aria-labelledby="booking-chart-title"
        >
          <title id="booking-chart-title">
            Bookings overview from June 9 to June 15
          </title>
          <defs>
            <linearGradient id="booking-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b9f34b" stopOpacity="0.23" />
              <stop offset="100%" stopColor="#b9f34b" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((value, index) => {
            const y = 208 - index * 43;
            return (
              <g key={value}>
                <line x1="48" y1={y} x2="700" y2={y} stroke="#ecece7" />
                <text x="12" y={y + 4} fontSize="11" fill="#666b64">
                  {value}
                </text>
              </g>
            );
          })}
          <path
            d={`M ${bookingPoints} L 700 208 L 48 208 Z`}
            fill="url(#booking-area)"
          />
          <polyline
            points={bookingPoints}
            fill="none"
            stroke="#65bd00"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={completedPoints}
            fill="none"
            stroke="#b1b4af"
            strokeWidth="1.6"
            strokeDasharray="7 5"
            strokeLinejoin="round"
          />
          {BOOKINGS_SERIES.map((value, index) => {
            const x = 48 + index * (652 / 6);
            const y = 208 - value * 1.72;
            return (
              <circle key={index} cx={x} cy={y} r="4.5" fill="#65bd00">
                <title>{`${CHART_DATES[index]}: ${value} bookings`}</title>
              </circle>
            );
          })}
          {COMPLETED_SERIES.map((value, index) => {
            const x = 48 + index * (652 / 6);
            const y = 208 - value * 1.72;
            return <circle key={index} cx={x} cy={y} r="3.5" fill="#b1b4af" />;
          })}
          {CHART_DATES.map((date, index) => (
            <text
              key={date}
              x={48 + index * (652 / 6)}
              y="236"
              textAnchor={
                index === 0 ? "start" : index === 6 ? "end" : "middle"
              }
              fontSize="10.5"
              fill="#666b64"
            >
              {date}
            </text>
          ))}
        </svg>
      </figure>
    </section>
  );
}

function toChartPoints(values: number[]) {
  return values
    .map((value, index) => `${48 + index * (652 / 6)},${208 - value * 1.72}`)
    .join(" ");
}

function CourtBookings() {
  return (
    <section className="min-w-0 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_26px_rgba(23,26,22,0.035)] sm:p-6">
      <h2 className="text-base font-black tracking-[-0.02em]">
        Bookings by court
      </h2>
      <div className="mt-5 grid items-center gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
        <div className="relative mx-auto h-44 w-44">
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "conic-gradient(#69bf00 0 32%, #b9ea0f 32% 56%, #ffb80e 56% 74%, #ff684e 74% 88%, #e9e8e2 88% 100%)",
            }}
            role="img"
            aria-label="Court booking distribution: Court 1 32%, Court 2 24%, Court 3 18%, Court 4 14%, Court 5 12%"
          />
          <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-3xl font-black tracking-[-0.045em]">128</p>
              <p className="text-muted-foreground text-[10px]">Total</p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-2 flex justify-between text-[9px] font-bold tracking-wider uppercase">
            <span>Court</span>
            <span>Bookings</span>
          </div>
          {COURTS.map((court) => (
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
      <Link
        href="/dashboard/reports"
        className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#f6f6f2] text-[11px] font-bold transition-colors hover:bg-[#efefe9] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
      >
        View full report <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function UpcomingBookings() {
  return (
    <DashboardListCard
      title="Upcoming bookings"
      action="View all"
      href="/dashboard/bookings"
    >
      <div className="mt-2">
        {UPCOMING_BOOKINGS.map((booking, index) => (
          <article
            key={`${booking.date}-${booking.title}`}
            className="grid grid-cols-[42px_34px_minmax(0,1fr)] items-center gap-2.5 border-b border-black/[0.06] py-2.5 last:border-0"
          >
            <div className="rounded-lg border border-black/[0.08] bg-[#fafaf7] py-1 text-center shadow-sm">
              <span className="text-muted-foreground block text-[8px] font-bold">
                JUN
              </span>
              <span className="block text-base leading-tight font-black">
                {booking.date}
              </span>
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
                <p className="text-muted-foreground mt-1 text-[9px]">
                  {booking.players}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DashboardListCard>
  );
}

function RecentActivity() {
  return (
    <DashboardListCard
      title="Recent activity"
      action="View all"
      href="/dashboard/reports"
    >
      <div className="mt-2 space-y-1">
        {RECENT_ACTIVITY.map((activity) => {
          const Icon = activity.icon;
          return (
            <article
              key={activity.title}
              className="flex items-center gap-3 py-2"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  activity.tone === "coral"
                    ? "bg-[#fff0ec] text-[#f25d43]"
                    : "bg-[#f1f9df] text-[#347e20]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{activity.title}</p>
                <p
                  className={`mt-0.5 truncate text-[10px] ${
                    activity.title.includes("review")
                      ? "text-[#e8a400]"
                      : "text-muted-foreground"
                  }`}
                >
                  {activity.detail}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </DashboardListCard>
  );
}

function TodaysSchedule() {
  const toneStyles: Record<string, string> = {
    green: "bg-[#eff9d8] text-[#367b20]",
    amber: "bg-[#fff5d9] text-[#ad7400]",
    blue: "bg-[#e8f1ff] text-[#2764ad]",
    neutral: "bg-[#f3f3ef] text-[#5d615b]",
  };

  return (
    <DashboardListCard
      title="Today's schedule"
      action="View calendar"
      href="/dashboard/calendar"
    >
      <ol className="mt-3">
        {TODAY_SCHEDULE.map((session, index) => (
          <li
            key={`${session.time}-${session.title}`}
            className="relative grid grid-cols-[60px_14px_minmax(0,1fr)_42px] items-start gap-2 py-2"
          >
            {index < TODAY_SCHEDULE.length - 1 && (
              <span className="absolute top-5 bottom-[-8px] left-[66px] w-px border-l border-dashed border-black/20" />
            )}
            <span className="text-muted-foreground pt-0.5 text-[10px]">
              {session.time}
            </span>
            <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-[#66bd00] ring-4 ring-white" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{session.title}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                {session.court}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-center text-[9px] font-bold ${toneStyles[session.tone]}`}
            >
              {session.capacity}
            </span>
          </li>
        ))}
      </ol>
    </DashboardListCard>
  );
}

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
