"use client";

import { addDays, format } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  LandPlot,
  Trophy,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  resource_id: string;
  service_id: string;
  customer_id: string;
  time_range: string | null;
  status: string;
  price_cents: number;
  created_at?: string;
  customers?: { id: string; name: string; email: string | null } | null;
  services?: {
    id: string;
    name: string;
    service_category?: string | null;
  } | null;
  resources?: { id: string; name: string; type?: string | null } | null;
};

type Payment = {
  id: string;
  booking_id?: string | null;
  amount_cents: number;
  status: string;
  type: string;
  category?: string | null;
  created_at: string;
  bookings?: Booking | null;
};

type Resource = {
  id: string;
  name: string;
  type: string | null;
  is_active: boolean;
  locations?: { id: string; name: string } | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
};

type Match = {
  id: string;
  resource_id: string | null;
  status: string;
  match_type: string;
  starts_at: string;
};

type Player = {
  id: string;
  name: string;
  status: string;
  skill_level: number;
  created_at: string;
};

const TABS = [
  "Overview",
  "Bookings",
  "Revenue",
  "Customers",
  "Courts",
  "Matches",
  "Players",
];

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function rangeStart(value: string | null) {
  if (!value) return null;
  const match = value.match(/"([^"]+)"/);
  return match ? new Date(match[1]!) : null;
}

function paymentCategory(payment: Payment) {
  if (payment.category) return payment.category;
  if (payment.type === "refund" || payment.status === "refunded")
    return "refund";
  return "booking";
}

function paidRevenue(payments: Payment[]) {
  const paid = payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => {
      const sign = paymentCategory(payment) === "refund" ? -1 : 1;
      return sum + sign * payment.amount_cents;
    }, 0);
  return Math.max(0, paid);
}

function percentChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({
  selectedDate,
  weekStart,
  weekEnd,
  previousWeekStart,
  bookings,
  previousBookings,
  resources,
  customers,
  payments,
  previousPayments,
  matches,
  previousMatches,
  players,
  generatedBy,
}: {
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
  previousWeekStart: string;
  bookings: Booking[];
  previousBookings: Booking[];
  resources: Resource[];
  customers: Customer[];
  payments: Payment[];
  previousPayments: Payment[];
  matches: Match[];
  previousMatches: Match[];
  players: Player[];
  generatedBy: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 3;
  const selectedDateValue = new Date(selectedDate);
  const weekStartValue = new Date(weekStart);
  const weekEndValue = new Date(weekEnd);
  const previousWeekStartValue = new Date(previousWeekStart);
  const weekEndDisplay = addDays(weekEndValue, -1);

  const metrics = useMemo(() => {
    const revenue = paidRevenue(payments);
    const previousRevenue = paidRevenue(previousPayments);
    const activeCustomers = new Set(
      bookings.map((booking) => booking.customer_id),
    );
    const previousCustomers = new Set(
      previousBookings.map((booking) => booking.customer_id),
    );
    const utilization = resources.length
      ? Math.round(
          (new Set(bookings.map((booking) => booking.resource_id)).size /
            resources.length) *
            100,
        )
      : 0;
    const previousUtilization = resources.length
      ? Math.round(
          (new Set(previousBookings.map((booking) => booking.resource_id))
            .size /
            resources.length) *
            100,
        )
      : 0;

    return {
      revenue,
      revenueChange: percentChange(revenue, previousRevenue),
      bookings: bookings.length,
      bookingsChange: percentChange(bookings.length, previousBookings.length),
      customers: customers.length,
      customersChange: percentChange(
        activeCustomers.size,
        previousCustomers.size,
      ),
      utilization,
      utilizationChange: percentChange(utilization, previousUtilization),
      matches: matches.length,
      matchesChange: percentChange(matches.length, previousMatches.length),
      players: players.length,
    };
  }, [
    bookings,
    customers.length,
    matches.length,
    payments,
    previousBookings,
    previousMatches.length,
    previousPayments,
    players.length,
    resources.length,
  ]);

  const dailyRevenue = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const day = addDays(weekStartValue, index);
        const previousDay = addDays(previousWeekStartValue, index);
        return {
          day,
          current: dailyPaymentTotal(payments, day),
          previous: dailyPaymentTotal(previousPayments, previousDay),
        };
      }),
    [payments, previousPayments, previousWeekStartValue, weekStartValue],
  );

  const statusRows = getStatusRows(bookings);
  const revenueRows = getRevenueBreakdown(payments, bookings);
  const timeSlotRows = getTimeSlotRows(bookings);
  const topCourts = getTopCourts(resources, bookings);
  const reportRows = [
    "Weekly Overview Report",
    "Bookings Report",
    "Revenue Report",
    "Court Utilization Report",
    "Customers Report",
  ];

  const filteredBookings =
    filterStatuses.length > 0
      ? bookings.filter((b) => filterStatuses.includes(b.status))
      : bookings;
  const filteredStatusRows = getStatusRows(filteredBookings);
  const filteredTimeSlotRows = getTimeSlotRows(filteredBookings);

  function navigateTo(date: Date) {
    router.push(`/dashboard/reports?date=${dateParam(date)}`);
  }

  function exportReport(kind = "overview") {
    downloadCsv(`sked-${kind}-${dateParam(weekStartValue)}.csv`, [
      ["Metric", "Value"],
      ["Total Revenue", metrics.revenue / 100],
      ["Total Bookings", metrics.bookings],
      ["Total Customers", metrics.customers],
      ["Court Utilization", `${metrics.utilization}%`],
      ["Total Matches", metrics.matches],
    ]);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Track performance and analyze your business.
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
              {format(weekEndDisplay, "MMM d, yyyy")}
            </span>
          </button>
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter />
              Filters
              {filterStatuses.length > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#62c51c] text-[10px] font-bold text-white">
                  {filterStatuses.length}
                </span>
              )}
            </Button>
            {showFilters && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-black/[0.07] bg-white p-4 shadow-lg">
                <h3 className="mb-3 text-xs font-black text-[#5f655d] uppercase">
                  Booking Status
                </h3>
                <div className="space-y-2">
                  {["confirmed", "completed", "cancelled", "no_show"].map(
                    (status) => (
                      <label
                        key={status}
                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={filterStatuses.includes(status)}
                          onChange={(e) => {
                            setFilterStatuses((prev) =>
                              e.target.checked
                                ? [...prev, status]
                                : prev.filter((s) => s !== status),
                            );
                            setCurrentPage(1);
                          }}
                          className="h-4 w-4 rounded border-black/[0.15] accent-[#62c51c]"
                        />
                        {status.charAt(0).toUpperCase() +
                          status.slice(1).replace("_", " ")}
                      </label>
                    ),
                  )}
                </div>
                {filterStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatuses([]);
                      setCurrentPage(1);
                    }}
                    className="mt-3 w-full rounded-lg bg-[#f3f2ef] py-2 text-xs font-bold text-[#5f655d]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={() => exportReport("overview")}
          >
            <Download />
            Export report
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          icon={<Wallet />}
          label="Total Revenue"
          value={formatCurrency(metrics.revenue)}
          change={metrics.revenueChange}
          tone="green"
        />
        <StatCard
          icon={<CalendarDays />}
          label="Total Bookings"
          value={String(metrics.bookings)}
          change={metrics.bookingsChange}
          tone="blue"
        />
        <StatCard
          icon={<UsersRound />}
          label="Total Customers"
          value={String(metrics.customers)}
          change={metrics.customersChange}
          tone="amber"
        />
        <StatCard
          icon={<LandPlot />}
          label="Court Utilization"
          value={`${metrics.utilization}%`}
          change={metrics.utilizationChange}
          tone="purple"
        />
        <StatCard
          icon={<Trophy />}
          label="Total Matches"
          value={String(metrics.matches || metrics.players)}
          change={metrics.matchesChange}
          tone="green"
        />
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="border-b border-black/[0.07] px-6 pt-5">
              <div className="flex gap-8 overflow-x-auto">
                {TABS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setTab(item);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "shrink-0 border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
                      tab === item
                        ? "border-[#62c51c] text-[#171a16]"
                        : "border-transparent text-[#5f655d]",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {tab === "Overview" && (
              <>
                <div className="grid gap-3 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                  <RevenueChart days={dailyRevenue} />
                  <StatusDonut rows={statusRows} total={bookings.length} />
                </div>
                <div className="grid gap-3 border-t border-black/[0.07] p-5 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
                  <RevenueBreakdown rows={revenueRows} total={metrics.revenue} />
                  <TimeSlotBars rows={timeSlotRows} />
                </div>
              </>
            )}
            {tab === "Bookings" && (
              <div className="grid gap-3 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                <StatusDonut rows={filteredStatusRows} total={filteredBookings.length} />
                <TimeSlotBars rows={filteredTimeSlotRows} />
              </div>
            )}
            {tab === "Revenue" && (
              <div className="grid gap-3 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                <RevenueChart days={dailyRevenue} />
                <RevenueBreakdown rows={revenueRows} total={metrics.revenue} />
              </div>
            )}
            {tab === "Customers" && (
              <div className="p-5">
                <p className="mb-4 text-2xl font-black">{customers.length} total customers</p>
                <div className="divide-y divide-black/[0.06]">
                  {customers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#626860]">No customer data available.</p>
                  ) : (
                    customers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-black">{c.name}</p>
                          <p className="text-xs text-[#626860]">{c.email ?? "—"}</p>
                        </div>
                        <span className="text-xs text-[#626860]">
                          {format(new Date(c.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {tab === "Courts" && (
              <div className="p-5">
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                    <p className="text-xs font-semibold text-[#626860]">Total Courts</p>
                    <p className="mt-1 text-2xl font-black">{resources.length}</p>
                  </div>
                  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                    <p className="text-xs font-semibold text-[#626860]">Utilization</p>
                    <p className="mt-1 text-2xl font-black">{metrics.utilization}%</p>
                  </div>
                </div>
                {resources.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#626860]">No court data available.</p>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {resources.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-3">
                        <span className="text-sm font-black">{r.name}</span>
                        <span className="text-xs text-[#626860]">{r.type ?? "Court"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "Matches" && (
              <div className="p-5">
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                    <p className="text-xs font-semibold text-[#626860]">Total Matches</p>
                    <p className="mt-1 text-2xl font-black">{matches.length}</p>
                  </div>
                  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                    <p className="text-xs font-semibold text-[#626860]">Active Players</p>
                    <p className="mt-1 text-2xl font-black">{players.length}</p>
                  </div>
                </div>
                {matches.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#626860]">No match data available.</p>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {matches.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-black">{m.match_type}</p>
                          <p className="text-xs text-[#626860]">{m.status}</p>
                        </div>
                        <span className="text-xs text-[#626860]">
                          {format(new Date(m.starts_at), "MMM d, hh:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "Players" && (
              <div className="p-5">
                <p className="mb-4 text-2xl font-black">{players.length} total players</p>
                {players.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#626860]">No player data available.</p>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <span className="text-sm font-black">{p.name}</span>
                        <span className="text-xs text-[#626860]">
                          Skill: {p.skill_level} — {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="px-6 py-5">
              <h2 className="text-sm font-black">Recent Reports</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
                    <th className="px-6 py-4">Report Name</th>
                    <th className="px-2 py-4">Type</th>
                    <th className="px-2 py-4">Date Range</th>
                    <th className="px-2 py-4">Generated On</th>
                    <th className="px-2 py-4">Generated By</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows
                    .slice(
                      (currentPage - 1) * PAGE_SIZE,
                      currentPage * PAGE_SIZE,
                    )
                    .map((name) => (
                    <tr key={name} className="border-b border-black/[0.06]">
                      <td className="px-6 py-4 text-sm font-black">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#626860]" />
                          {name}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-sm">
                        {name.replace(" Report", "").replace("Weekly ", "")}
                      </td>
                      <td className="px-2 py-4 text-sm">
                        {format(weekStartValue, "MMM d")} -{" "}
                        {format(weekEndDisplay, "MMM d, yyyy")}
                      </td>
                      <td className="px-2 py-4 text-sm">
                        {format(addDays(weekEndDisplay, 0), "MMM d, yyyy")} -{" "}
                        {format(new Date(), "hh:mm a")}
                      </td>
                      <td className="px-2 py-4 text-sm">{generatedBy}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Download ${name}`}
                          onClick={() =>
                            exportReport(
                              name.toLowerCase().replaceAll(" ", "-"),
                            )
                          }
                        >
                          <Download />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-2 px-6 py-4">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
              </Button>
              {Array.from(
                {
                  length: Math.max(
                    1,
                    Math.ceil(reportRows.length / PAGE_SIZE),
                  ),
                },
                (_, i) => i + 1,
              ).map((page) => (
                <Button
                  key={page}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                  className={
                    page === currentPage
                      ? "bg-[#11130f] text-white"
                      : "border border-black/[0.07] bg-white text-[#5f655d]"
                  }
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                disabled={
                  currentPage ===
                  Math.max(1, Math.ceil(reportRows.length / PAGE_SIZE))
                }
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <ReportSummary
            weekStart={weekStartValue}
            weekEnd={weekEndDisplay}
            previousWeekStart={previousWeekStartValue}
          />
          <TopCourts courts={topCourts} onViewAll={() => setTab("Courts")} />
          <DownloadReports onExport={exportReport} />
        </aside>
      </div>
    </div>
  );
}

function dailyPaymentTotal(payments: Payment[], day: Date) {
  return payments
    .filter((payment) => {
      const created = new Date(payment.created_at);
      return (
        created.toDateString() === day.toDateString() &&
        payment.status === "succeeded"
      );
    })
    .reduce((sum, payment) => {
      const sign = paymentCategory(payment) === "refund" ? -1 : 1;
      return sum + sign * payment.amount_cents;
    }, 0);
}

function getStatusRows(bookings: Booking[]) {
  const statuses: Array<[string, string, string]> = [
    ["completed", "Completed", "#62c51c"],
    ["confirmed", "Upcoming", "#5b9fe8"],
    ["cancelled", "Cancelled", "#f0ae2b"],
    ["no_show", "No-show", "#ef554d"],
  ];
  return statuses.map(([status, label, color]) => ({
    status,
    label,
    color,
    count: bookings.filter((booking) => booking.status === status).length,
  }));
}

function getRevenueBreakdown(payments: Payment[], bookings: Booking[]) {
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const rows: Array<[string, string, string]> = [
    ["booking", "Court Bookings", "#62c51c"],
    ["subscription", "Memberships", "#5b9fe8"],
    ["refund", "Refunds", "#f0ae2b"],
    ["payout", "Payouts", "#8e62d9"],
  ];
  return rows.map(([category, label, color]) => ({
    category,
    label,
    color,
    amount: payments
      .filter((payment) => {
        const belongsToWeek =
          !payment.booking_id || bookingIds.has(payment.booking_id);
        return belongsToWeek && paymentCategory(payment) === category;
      })
      .reduce((sum, payment) => sum + payment.amount_cents, 0),
  }));
}

function getTimeSlotRows(bookings: Booking[]) {
  const slots = [
    { label: "6AM - 9AM", start: 6, end: 9 },
    { label: "9AM - 12PM", start: 9, end: 12 },
    { label: "12PM - 3PM", start: 12, end: 15 },
    { label: "3PM - 6PM", start: 15, end: 18 },
    { label: "6PM - 9PM", start: 18, end: 21 },
    { label: "9PM - 12AM", start: 21, end: 24 },
  ];
  return slots.map((slot) => ({
    ...slot,
    count: bookings.filter((booking) => {
      const start = rangeStart(booking.time_range);
      if (!start) return false;
      const hour = start.getHours();
      return hour >= slot.start && hour < slot.end;
    }).length,
  }));
}

function getTopCourts(resources: Resource[], bookings: Booking[]) {
  const total = Math.max(bookings.length, 1);
  return resources
    .map((resource) => {
      const count = bookings.filter(
        (booking) => booking.resource_id === resource.id,
      ).length;
      return {
        resource,
        count,
        utilization: Math.round((count / total) * 100),
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count || a.resource.name.localeCompare(b.resource.name),
    )
    .slice(0, 5);
}

function StatCard({
  icon,
  label,
  value,
  change,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  change: number;
  tone: "green" | "blue" | "amber" | "purple";
}) {
  return (
    <article className="flex min-h-28 items-center gap-4 rounded-2xl border border-black/[0.06] bg-white px-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-full [&_svg]:h-6 [&_svg]:w-6",
          tone === "green" && "bg-[#ebf7d7] text-[#326d1e]",
          tone === "blue" && "bg-[#e5efff] text-[#347ad9]",
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
        <span className="mt-2 block text-2xl leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span
          className={cn(
            "mt-3 block text-xs font-semibold",
            change >= 0 ? "text-[#32740f]" : "text-[#d73933]",
          )}
        >
          {change >= 0 ? "↗" : "↘"} {Math.abs(change)}% vs previous 7 days
        </span>
      </span>
    </article>
  );
}

function RevenueChart({
  days,
}: {
  days: Array<{ day: Date; current: number; previous: number }>;
}) {
  const max = Math.max(
    ...days.flatMap((day) => [day.current, day.previous]),
    1,
  );
  const currentPoints = chartPoints(
    days.map((day) => day.current),
    max,
  );
  const previousPoints = chartPoints(
    days.map((day) => day.previous),
    max,
  );

  return (
    <section className="rounded-xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Revenue Overview</h2>
        <SelectField
          value="daily"
          options={[{ value: "daily", label: "Daily" }]}
        />
      </div>
      <div className="mt-4 flex items-center gap-6 text-xs font-semibold">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 bg-[#62c51c]" />
          This period
        </span>
        <span className="inline-flex items-center gap-2 text-[#8a8f86]">
          <span className="h-0.5 w-4 border-t border-dashed border-[#bfc2bb]" />
          Previous period
        </span>
      </div>
      <svg className="mt-4 h-48 w-full" viewBox="0 0 640 210" role="img">
        {[20, 65, 110, 155, 200].map((y) => (
          <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#e8e7df" />
        ))}
        <polyline
          points={previousPoints}
          fill="none"
          stroke="#c7cbc3"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <polygon
          points={`20,200 ${currentPoints} 620,200`}
          fill="#ebf7d7"
          opacity="0.7"
        />
        <polyline
          points={currentPoints}
          fill="none"
          stroke="#62b91f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {days.map((day, index) => {
          const x = 20 + index * 100;
          const y = 200 - (day.current / max) * 170;
          return (
            <circle
              key={day.day.toISOString()}
              cx={x}
              cy={y}
              r="4"
              fill="#62b91f"
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#626860]">
        {days.map((day) => (
          <span key={day.day.toISOString()}>{format(day.day, "MMM d")}</span>
        ))}
      </div>
    </section>
  );
}

function chartPoints(values: number[], max: number) {
  return values
    .map((value, index) => {
      const x = 20 + index * 100;
      const y = 200 - (value / max) * 170;
      return `${x},${y}`;
    })
    .join(" ");
}

function StatusDonut({
  rows,
  total,
}: {
  rows: Array<{ label: string; color: string; count: number }>;
  total: number;
}) {
  return (
    <section className="rounded-xl border border-black/[0.06] bg-white p-5">
      <h2 className="text-sm font-black">Bookings by Status</h2>
      <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-center">
        <Donut
          rows={rows.map((row) => ({
            color: row.color,
            percent: total ? Math.round((row.count / total) * 100) : 0,
          }))}
          center={
            <>
              <span className="block text-2xl font-black">{total}</span>
              <span className="text-[10px] text-[#6b7068]">Total</span>
            </>
          }
        />
        <div className="min-w-0 flex-1 space-y-4 text-sm">
          {rows.map((row) => (
            <SummaryRow
              key={row.label}
              label={row.label}
              count={row.count}
              total={total}
              color={row.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RevenueBreakdown({
  rows,
  total,
}: {
  rows: Array<{ label: string; color: string; amount: number }>;
  total: number;
}) {
  return (
    <section className="rounded-xl border border-black/[0.06] bg-white p-5">
      <h2 className="text-sm font-black">Revenue Breakdown</h2>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <Donut
          rows={rows.map((row) => ({
            color: row.color,
            percent: total ? Math.round((row.amount / total) * 100) : 0,
          }))}
          center={
            <>
              <span className="block text-sm font-black">
                {formatCurrency(total)}
              </span>
              <span className="text-[10px] text-[#6b7068]">Total</span>
            </>
          }
        />
        <div className="min-w-0 flex-1 space-y-4 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto_42px] items-center gap-3"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
              <span className="font-black">{formatCurrency(row.amount)}</span>
              <span className="text-right text-xs text-[#626860]">
                {total ? Math.round((row.amount / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimeSlotBars({
  rows,
}: {
  rows: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="rounded-xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Bookings by Time Slot</h2>
        <span className="flex items-center gap-2 text-xs font-semibold">
          <span className="h-2 w-2 rounded-sm bg-[#62c51c]" />
          Bookings
        </span>
      </div>
      <div className="mt-6 grid h-44 grid-cols-6 items-end gap-5 border-b border-black/[0.08] px-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex h-full flex-col items-center justify-end gap-2"
          >
            <span className="text-xs font-black">{row.count}</span>
            <span
              className="w-full max-w-10 rounded-t-md bg-[#62c51c]"
              style={{ height: `${Math.max(8, (row.count / max) * 130)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs font-semibold text-[#626860]">
        {rows.map((row) => (
          <span key={row.label}>{row.label}</span>
        ))}
      </div>
    </section>
  );
}

function Donut({
  rows,
  center,
}: {
  rows: Array<{ color: string; percent: number }>;
  center: ReactNode;
}) {
  let start = 0;
  const stops = rows
    .filter((row) => row.percent > 0)
    .map((row) => {
      const end = start + row.percent * 3.6;
      const stop = `${row.color} ${start}deg ${end}deg`;
      start = end;
      return stop;
    });
  const background =
    stops.length > 0
      ? `conic-gradient(${stops.join(", ")}, #e8e7df ${start}deg 360deg)`
      : "conic-gradient(#e8e7df 0deg 360deg)";
  return (
    <div
      className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
      style={{ background }}
    >
      <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-sm">
        <span>{center}</span>
      </span>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-right font-black whitespace-nowrap">
        {count}{" "}
        <span className="font-semibold text-[#6b7068]">
          ({total ? Math.round((count / total) * 100) : 0}%)
        </span>
      </span>
    </div>
  );
}

function ReportSummary({
  weekStart,
  weekEnd,
  previousWeekStart,
}: {
  weekStart: Date;
  weekEnd: Date;
  previousWeekStart: Date;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Report Summary</h2>
      <div className="mt-6 space-y-5 text-sm">
        <InfoRow
          label="Date Range"
          value={`${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`}
        />
        <InfoRow
          label="Compared To"
          value={`${format(previousWeekStart, "MMM d")} - ${format(addDays(weekStart, -1), "MMM d, yyyy")}`}
        />
        <InfoRow label="Data Source" value="All branches" />
        <InfoRow
          label="Generated On"
          value={format(new Date(), "MMM d, yyyy - hh:mm a")}
        />
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#626860]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function TopCourts({
  courts,
  onViewAll,
}: {
  courts: Array<{ resource: Resource; count: number; utilization: number }>;
  onViewAll?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Top Performing Courts</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-[#547b14]"
        >
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {courts.length === 0 ? (
          <p className="text-sm text-[#626860]">No courts available yet.</p>
        ) : (
          courts.map((court) => (
            <div
              key={court.resource.id}
              className="grid grid-cols-[48px_1fr_92px] items-center gap-3"
            >
              <span className="grid h-10 w-12 place-items-center rounded-lg bg-[#dce8ff] text-xs font-black text-[#326d1e]">
                CT
              </span>
              <span>
                <span className="block text-sm font-black">
                  {court.resource.name}
                </span>
                <span className="text-xs text-[#626860]">
                  {court.resource.locations?.name ??
                    court.resource.type ??
                    "Court"}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-[#e8e7df]">
                  <span
                    className="block h-full rounded-full bg-[#62c51c]"
                    style={{ width: `${court.utilization}%` }}
                  />
                </span>
                <span className="w-8 text-right text-xs font-black">
                  {court.utilization}%
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DownloadReports({ onExport }: { onExport: (kind: string) => void }) {
  const rows = [
    "Bookings Report (CSV)",
    "Revenue Report (CSV)",
    "Customer Report (CSV)",
    "Court Utilization Report (CSV)",
    "Matches Report (CSV)",
  ];
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Download Reports</h2>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <button
            key={row}
            type="button"
            onClick={() => onExport(row.toLowerCase().replaceAll(" ", "-"))}
            className="flex w-full items-center justify-between text-left text-sm font-semibold"
          >
            <span className="inline-flex items-center gap-3">
              <FileText className="h-4 w-4 text-[#626860]" />
              {row}
            </span>
            <Download className="h-4 w-4" />
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectField({
  value,
  options,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative inline-flex h-9 min-w-24 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-8 pl-3 text-xs font-bold outline-none"
        value={value}
        onChange={() => undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-[#626860]" />
    </label>
  );
}
