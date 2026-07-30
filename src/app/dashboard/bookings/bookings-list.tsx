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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { cn, formatCurrency } from "@/lib/utils";
import {
  findConflicts,
  getNextAvailableTime,
  conflictMessage,
} from "@/lib/availability";

type Payment = {
  id: string;
  provider: string;
  provider_ref: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type Booking = {
  id: string;
  time_range: string;
  status: string;
  price_cents: number;
  source: string | null;
  created_at: string;
  customers: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  services: {
    id?: string;
    name: string;
    duration_min: number;
    price_cents?: number;
  } | null;
  resources: { id?: string; name: string; type?: string | null } | null;
  payments?: Payment[];
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

type BookingFormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  resourceId: string;
  serviceId: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: "unpaid" | "paid";
};

const STATUS_OPTIONS = [
  "held",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

const BOOKING_TABS = [
  ["all", "All Bookings"],
  ["confirmed", "Confirmed"],
  ["pending", "Pending"],
  ["cancelled", "Cancelled"],
] as const;

function normalizeRangeDate(raw: string) {
  const trimmed = raw.trim().replace(" ", "T");
  const withOffset = /[+-]\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  return new Date(
    /[zZ]|[+-]\d{2}:\d{2}$/.test(withOffset) ? withOffset : `${withOffset}Z`,
  );
}

function parseRange(range: string) {
  const match = range?.match(/\[([^,]+),([^\])]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  const start = normalizeRangeDate(match[1]);
  const end = normalizeRangeDate(match[2]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatRange(start: Date, end: Date) {
  return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
}

function bookingCode(id: string) {
  return `#BK-${
    id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() || "00000"
  }`;
}

function initials(name?: string | null) {
  return (name ?? "Guest")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPaymentState(booking: Booking) {
  const payments = booking.payments ?? [];
  const paid = payments.find((payment) => payment.status === "succeeded");
  const refunded = payments.find((payment) => payment.status === "refunded");
  const pending = payments.find((payment) => payment.status === "pending");

  if (refunded) return { label: "Refunded", tone: "gray", payment: refunded };
  if (paid) return { label: "Paid", tone: "green", payment: paid };
  if (pending) return { label: "Pending", tone: "amber", payment: pending };
  return { label: "Unpaid", tone: "amber", payment: null };
}

function makeRange(date: string, time: string, duration: number) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + duration * 60000);
  return { start, end };
}

export function BookingsList({
  orgId,
  bookings,
  totalCount,
  resources,
  services,
  selectedDate,
  weekStart,
  weekEnd,
}: {
  orgId: string;
  bookings: Booking[];
  totalCount: number;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showFilterToolbar, setShowFilterToolbar] = useState(true);
  const [page, setPage] = useState(1);

  const [formState, setFormState] = useState<BookingFormState>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    resourceId: resources[0]?.id ?? "",
    serviceId: services[0]?.id ?? "",
    date: dateParam(selectedDateValue),
    time: "10:00",
    status: "confirmed",
    paymentStatus: "unpaid",
  });

  // ── Conflict detection ──
  const bookingConflicts = useMemo(() => {
    if (!formState.resourceId || !formState.serviceId || !formState.date || !formState.time) return [];
    const service = services.find((s) => s.id === formState.serviceId);
    if (!service) return [];
    const start = new Date(`${formState.date}T${formState.time}:00`);
    const end = new Date(start.getTime() + service.duration_min * 60_000);
    return findConflicts(bookings, formState.resourceId, start, end);
  }, [formState, bookings, services]);

  const conflictWarning = useMemo(
    () => conflictMessage(bookingConflicts),
    [bookingConflicts],
  );

  // Auto-suggest earliest available time when resource/service/date changes
  // (skip first run — initial formState already has a default time)
  const initialRender = useRef(true);
  // Latest bookings/services are read through a ref so the effect below sees
  // fresh data without re-firing on every refresh and clobbering a manual pick.
  const suggestionData = useRef({ bookings, services });
  useEffect(() => {
    suggestionData.current = { bookings, services };
  }, [bookings, services]);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (!formState.resourceId || !formState.serviceId) return;
    const { bookings: latestBookings, services: latestServices } =
      suggestionData.current;
    const service = latestServices.find((s) => s.id === formState.serviceId);
    if (!service) return;
    const suggested = getNextAvailableTime(
      latestBookings,
      formState.resourceId,
      service.duration_min,
      formState.date,
    );
    setFormState((prev) => ({ ...prev, time: suggested }));
  }, [formState.resourceId, formState.serviceId, formState.date]);

  const parsedBookings = useMemo(
    () =>
      bookings
        .map((booking) => ({ booking, range: parseRange(booking.time_range) }))
        .filter(
          (
            item,
          ): item is { booking: Booking; range: { start: Date; end: Date } } =>
            Boolean(item.range),
        ),
    [bookings],
  );

  const bookingTypes = Array.from(
    new Set(
      parsedBookings
        .map(({ booking }) => booking.services?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const counts = {
    confirmed: bookings.filter((booking) => booking.status === "confirmed")
      .length,
    pending: bookings.filter((booking) => booking.status === "pending").length,
    cancelled: bookings.filter((booking) => booking.status === "cancelled")
      .length,
    revenue: bookings.reduce((sum, booking) => {
      const paid = (booking.payments ?? []).filter(
        (payment) => payment.status === "succeeded",
      );
      return (
        sum +
        paid.reduce(
          (paymentSum, payment) => paymentSum + payment.amount_cents,
          0,
        )
      );
    }, 0),
  };

  const filtered = parsedBookings.filter(({ booking }) => {
    const payment = getPaymentState(booking);
    const haystack =
      `${booking.id} ${booking.customers?.name ?? ""} ${booking.customers?.email ?? ""} ${booking.resources?.name ?? ""} ${booking.services?.name ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesTab = tab === "all" || booking.status === tab;
    const matchesCourt =
      courtFilter === "all" ||
      booking.resources?.id === courtFilter ||
      booking.resources?.name ===
        resources.find((resource) => resource.id === courtFilter)?.name;
    const matchesType =
      typeFilter === "all" || booking.services?.name === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      booking.status === statusFilter ||
      payment.label.toLowerCase() === statusFilter;
    return (
      matchesQuery && matchesTab && matchesCourt && matchesType && matchesStatus
    );
  });

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const miniMonthStart = startOfMonth(selectedDateValue);
  const miniDays = eachDayOfInterval({
    start: startOfWeek(miniMonthStart, { weekStartsOn: 1 }),
    end: addDays(
      startOfWeek(endOfMonth(selectedDateValue), { weekStartsOn: 1 }),
      6,
    ),
  });
  const recentActivity = parsedBookings
    .slice()
    .sort(
      (a, b) =>
        new Date(b.booking.created_at).getTime() -
        new Date(a.booking.created_at).getTime(),
    )
    .slice(0, 4);

  function navigateTo(date: Date) {
    router.push(`/dashboard/bookings?date=${dateParam(date)}`);
  }

  async function handleStatus(bookingId: string, status: string) {
    setActionId(bookingId);
    await db.from("bookings").update({ status }).eq("id", bookingId);
    setActionId(null);
    setSelectedBooking(null);
    router.refresh();
  }

  async function handleMarkPaid(booking: Booking) {
    setActionId(booking.id);
    await db.from("payments").insert({
      booking_id: booking.id,
      provider: "manual",
      provider_ref: `manual-${Date.now()}-${crypto.randomUUID()}`,
      type: "full",
      amount_cents: booking.price_cents,
      status: "succeeded",
    });
    setActionId(null);
    setSelectedBooking(null);
    router.refresh();
  }

  async function handleNewBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const resource = resources.find((item) => item.id === formState.resourceId);
    const service = services.find((item) => item.id === formState.serviceId);
    if (!resource || !service || !formState.customerName.trim()) {
      setFormError("Choose a court, booking type, and customer name.");
      return;
    }

    setActionId("new-booking");
    let customerId: string | null = null;

    if (formState.customerEmail) {
      const { data } = await db
        .from("customers")
        .select("id")
        .eq("org_id", orgId)
        .eq("email", formState.customerEmail)
        .maybeSingle();
      customerId = data?.id ?? null;
    }

    if (!customerId && formState.customerPhone) {
      const { data } = await db
        .from("customers")
        .select("id")
        .eq("org_id", orgId)
        .eq("phone", formState.customerPhone)
        .maybeSingle();
      customerId = data?.id ?? null;
    }

    if (!customerId) {
      const { data, error } = await db
        .from("customers")
        .insert({
          org_id: orgId,
          name: formState.customerName.trim(),
          email: formState.customerEmail.trim() || null,
          phone: formState.customerPhone.trim() || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        setActionId(null);
        setFormError(error?.message ?? "Could not create the customer.");
        return;
      }
      customerId = data.id;
    }

    const { start, end } = makeRange(
      formState.date,
      formState.time,
      service.duration_min,
    );
    const { data: created, error } = await db
      .from("bookings")
      .insert({
        org_id: orgId,
        resource_id: resource.id,
        service_id: service.id,
        customer_id: customerId,
        time_range: `[${start.toISOString()},${end.toISOString()})`,
        status: formState.status,
        price_cents: service.price_cents,
        source: "manual",
        idempotency_key: crypto.randomUUID(),
      })
      .select("id")
      .single();

    if (error || !created) {
      setActionId(null);
      setFormError(
        error?.message?.includes("no_overlap_when_held_or_confirmed")
          ? "⚠ Double-booking prevented: That court is already booked at this time. Try a different time or court."
          : (error?.message ?? "Could not create the booking."),
      );
      return;
    }

    if (formState.paymentStatus === "paid") {
      await db.from("payments").insert({
        booking_id: created.id,
        provider: "manual",
        provider_ref: `manual-${Date.now()}-${crypto.randomUUID()}`,
        type: "full",
        amount_cents: service.price_cents,
        status: "succeeded",
      });
    }

    setActionId(null);
    setNewDialogOpen(false);
    navigateTo(start);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            View and manage all court bookings.
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
          <Button variant="outline" onClick={() => setShowFilterToolbar((v) => !v)}>
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={() => setNewDialogOpen(true)}
          >
            <Plus />
            New booking
          </Button>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1.25fr]">
        <StatCard
          icon={<CalendarDays className="h-7 w-7" />}
          label="Total Bookings"
          value={String(totalCount)}
          detail="Selected week"
          tone="green"
        />
        <StatCard
          icon={<UsersRound className="h-7 w-7" />}
          label="Confirmed"
          value={String(counts.confirmed)}
          detail={`${totalCount ? Math.round((counts.confirmed / totalCount) * 100) : 0}% of total`}
          tone="green"
        />
        <StatCard
          icon={<Clock3 className="h-7 w-7" />}
          label="Pending"
          value={String(counts.pending)}
          detail={`${totalCount ? Math.round((counts.pending / totalCount) * 100) : 0}% of total`}
          tone="amber"
        />
        <StatCard
          icon={<XCircle className="h-7 w-7" />}
          label="Cancelled"
          value={String(counts.cancelled)}
          detail={`${totalCount ? Math.round((counts.cancelled / totalCount) * 100) : 0}% of total`}
          tone="red"
        />
        <StatCard
          icon={<CircleDollarSign className="h-7 w-7" />}
          label="Total Revenue"
          value={formatCurrency(counts.revenue)}
          detail="Paid payments"
          tone="green"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="border-b border-black/[0.07] px-6 pt-5">
            <div className="flex gap-8">
              {BOOKING_TABS.map(([value, label]) => (
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
                placeholder="Search by customer, court or booking ID..."
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
                { value: "all", label: "All booking types" },
                ...bookingTypes.map((type) => ({ value: type, label: type })),
              ]}
            />
            <SelectField
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: "all", label: "All status" },
                ...STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: status.replace("_", " "),
                })),
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
              ]}
            />
            <Button variant="outline" size="icon" aria-label="View options" onClick={() => { setCourtFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setQuery(""); setPage(1); }}>
              <ListFilter />
            </Button>
          </div>
          )}

          <BookingsTable
            bookings={paged}
            selectedIds={selectedIds}
            onToggle={(id) =>
              setSelectedIds((ids) =>
                ids.includes(id)
                  ? ids.filter((item) => item !== id)
                  : [...ids, id],
              )
            }
            onSelect={setSelectedBooking}
          />
          <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {paged.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to {(safePage - 1) * PAGE_SIZE + paged.length} of{" "}
              {filtered.length} bookings
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button key={p} size="icon" onClick={() => setPage(p)} className={p === safePage ? "bg-[#11130f] text-white" : "border border-black/[0.07] bg-white text-[#5f655d]"}>
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Calendar</h2>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => navigateTo(addMonths(selectedDateValue, -1))}
              >
                <ChevronLeft />
              </Button>
              <p className="text-sm font-black">
                {format(selectedDateValue, "MMMM yyyy")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => navigateTo(addMonths(selectedDateValue, 1))}
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
              {miniDays.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => navigateTo(day)}
                  className={cn(
                    "grid h-8 place-items-center rounded-full text-xs font-bold transition-colors",
                    !isSameMonth(day, selectedDateValue) && "text-[#b8bbb3]",
                    isSameDay(day, selectedDateValue)
                      ? "bg-[#7ad51f] text-white"
                      : "hover:bg-[#eff9d7]",
                    isToday(day) &&
                      !isSameDay(day, selectedDateValue) &&
                      "text-[#4c7a10]",
                  )}
                >
                  {format(day, "d")}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Booking summary</h2>
              <SelectField
                compact
                value="this-week"
                onChange={() => undefined}
                options={[{ value: "this-week", label: "This week" }]}
              />
            </div>
            <div className="mt-5 space-y-4 text-sm">
              <SummaryRow
                label="Confirmed"
                count={counts.confirmed}
                total={totalCount}
                color="bg-[#62c51c]"
              />
              <SummaryRow
                label="Pending"
                count={counts.pending}
                total={totalCount}
                color="bg-[#f0ae2b]"
              />
              <SummaryRow
                label="Cancelled"
                count={counts.cancelled}
                total={totalCount}
                color="bg-[#ef554d]"
              />
              <div className="flex justify-between border-t border-black/[0.07] pt-4 font-black">
                <span>Total</span>
                <span>{totalCount}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Recent activity</h2>
              <button
                type="button"
                className="text-xs font-bold text-[#547b14]"
                onClick={() => { setTab("all"); setCourtFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setQuery(""); setPage(1); }}
              >
                View all
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-[#6b7068]">
                  No recent booking activity yet.
                </p>
              ) : (
                recentActivity.map(({ booking }) => {
                  const payment = getPaymentState(booking);
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setSelectedBooking(booking)}
                      className="flex w-full gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-full",
                          booking.status === "cancelled"
                            ? "bg-[#fde9e7] text-[#e7473e]"
                            : payment.label === "Paid"
                              ? "bg-[#edf8df] text-[#3b8b18]"
                              : "bg-[#fff3d9] text-[#dd8b00]",
                        )}
                      >
                        {payment.label === "Paid" ? (
                          <CircleDollarSign className="h-4 w-4" />
                        ) : booking.status === "cancelled" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <UsersRound className="h-4 w-4" />
                        )}
                      </span>
                      <span>
                        <span className="block text-sm font-black">
                          {booking.status === "cancelled"
                            ? `Booking cancelled by ${booking.customers?.name ?? "customer"}`
                            : payment.label === "Paid"
                              ? "Payment received"
                              : `New booking by ${booking.customers?.name ?? "customer"}`}
                        </span>
                        <span className="mt-1 block text-xs text-[#6b7068]">
                          {booking.resources?.name ?? "No court"} ·{" "}
                          {format(
                            new Date(booking.created_at),
                            "MMM d, h:mm a",
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedBooking)}
        onOpenChange={() => setSelectedBooking(null)}
      >
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <BookingDetails
              booking={selectedBooking}
              actionId={actionId}
              onStatus={handleStatus}
              onMarkPaid={handleMarkPaid}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-2xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleNewBooking}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="booking-customer">Customer name</Label>
              <Input
                id="booking-customer"
                value={formState.customerName}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    customerName: event.target.value,
                  }))
                }
                required
                placeholder="Alex Rivera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-email">Email</Label>
              <Input
                id="booking-email"
                type="email"
                value={formState.customerEmail}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    customerEmail: event.target.value,
                  }))
                }
                placeholder="alex@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-phone">Phone</Label>
              <Input
                id="booking-phone"
                value={formState.customerPhone}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    customerPhone: event.target.value,
                  }))
                }
                placeholder="0917 123 4567"
              />
            </div>
            <FieldSelect
              id="booking-court"
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
              id="booking-service"
              label="Booking type"
              value={formState.serviceId}
              onChange={(value) =>
                setFormState((state) => ({ ...state, serviceId: value }))
              }
              options={services.map((service) => ({
                value: service.id,
                label: `${service.name} (${formatCurrency(service.price_cents)})`,
              }))}
            />
            <div className="space-y-2">
              <Label htmlFor="booking-date">Date</Label>
              <Input
                id="booking-date"
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
            <div className="space-y-2">
              <Label htmlFor="booking-time">Start time</Label>
              <Input
                id="booking-time"
                type="time"
                value={formState.time}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    time: event.target.value,
                  }))
                }
                required
              />
            </div>
            <FieldSelect
              id="booking-status"
              label="Status"
              value={formState.status}
              onChange={(value) =>
                setFormState((state) => ({ ...state, status: value }))
              }
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: status.replace("_", " "),
              }))}
            />
            <FieldSelect
              id="booking-payment"
              label="Payment"
              value={formState.paymentStatus}
              onChange={(value) =>
                setFormState((state) => ({
                  ...state,
                  paymentStatus: value as "unpaid" | "paid",
                }))
              }
              options={[
                { value: "unpaid", label: "Unpaid" },
                { value: "paid", label: "Paid manually" },
              ]}
            />
            {(resources.length === 0 || services.length === 0) && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                Add at least one active court and one active service before
                creating bookings.
              </p>
            )}
            {conflictWarning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                {conflictWarning}
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
                disabled={
                  actionId === "new-booking" ||
                  resources.length === 0 ||
                  services.length === 0
                }
              >
                {actionId === "new-booking" ? "Saving..." : "Create booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingsTable({
  bookings,
  selectedIds,
  onToggle,
  onSelect,
}: {
  bookings: Array<{ booking: Booking; range: { start: Date; end: Date } }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (booking: Booking) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No bookings match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="w-12 px-6 py-4">
              <span className="block h-4 w-4 rounded border border-black/15" />
            </th>
            <th className="px-2 py-4">Booking</th>
            <th className="px-2 py-4">Customer</th>
            <th className="px-2 py-4">Court</th>
            <th className="px-2 py-4">Date & Time</th>
            <th className="px-2 py-4">Type</th>
            <th className="px-2 py-4">Status</th>
            <th className="px-2 py-4">Payment</th>
            <th className="px-2 py-4">Amount</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(({ booking, range }) => {
            const payment = getPaymentState(booking);
            return (
              <tr
                key={booking.id}
                className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
              >
                <td className="px-6 py-4">
                  <input
                    aria-label={`Select ${bookingCode(booking.id)}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                    checked={selectedIds.includes(booking.id)}
                    onChange={() => onToggle(booking.id)}
                  />
                </td>
                <td className="px-2 py-4">
                  <p className="text-sm font-black">
                    {bookingCode(booking.id)}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {format(range.start, "MMM d, yyyy")}
                  </p>
                </td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1f241e] text-[10px] font-black text-white">
                      {initials(booking.customers?.name)}
                    </span>
                    <span>
                      <span className="block text-sm font-black">
                        {booking.customers?.name ?? "Unknown"}
                      </span>
                      <span className="mt-1 block text-xs text-[#6b7068]">
                        {booking.customers?.email ?? "No email"}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-3">
                    <CourtThumb />
                    <span>
                      <span className="block text-sm font-black">
                        {booking.resources?.name ?? "No court"}
                      </span>
                      <span className="mt-1 block text-xs text-[#6b7068]">
                        {booking.resources?.type ?? "Surface not set"}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-2 py-4">
                  <p className="text-sm font-semibold">
                    {format(range.start, "MMM d, yyyy")}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {formatRange(range.start, range.end)}
                  </p>
                </td>
                <td className="px-2 py-4">
                  <TypePill label={booking.services?.name ?? "Manual"} />
                </td>
                <td className="px-2 py-4">
                  <StatusPill status={booking.status} />
                </td>
                <td className="px-2 py-4">
                  <PaymentPill payment={payment} />
                </td>
                <td className="px-2 py-4 text-sm font-semibold">
                  {formatCurrency(booking.price_cents)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${bookingCode(booking.id)}`}
                    onClick={() => onSelect(booking)}
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
          "grid h-14 w-14 shrink-0 place-items-center rounded-full",
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

function SelectField({
  value,
  onChange,
  options,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-10 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm",
        compact ? "min-w-28" : "min-w-36",
      )}
    >
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

function StatusPill({ status }: { status: string }) {
  const style =
    status === "confirmed" || status === "completed"
      ? "bg-[#eff9d7] text-[#32740f]"
      : status === "pending" || status === "held"
        ? "bg-[#fff2d8] text-[#c17300]"
        : "bg-[#fde9e7] text-[#d43831]";
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        style,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function TypePill({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const style = lower.includes("social")
    ? "bg-[#f0e9ff] text-[#553093]"
    : lower.includes("private")
      ? "bg-[#eaf3ff] text-[#1d59a8]"
      : lower.includes("open")
        ? "bg-[#eef9df] text-[#3a7c12]"
        : "bg-[#fff4dc] text-[#8b5a08]";
  return (
    <span className={cn("rounded-lg px-3 py-1.5 text-xs font-black", style)}>
      {label}
    </span>
  );
}

function PaymentPill({
  payment,
}: {
  payment: ReturnType<typeof getPaymentState>;
}) {
  const style =
    payment.tone === "green"
      ? "text-[#27820e]"
      : payment.tone === "amber"
        ? "text-[#db8900]"
        : "text-[#6b7068]";
  return (
    <span>
      <span className={cn("block text-xs font-black", style)}>
        {payment.label}
      </span>
      <span className="mt-1 block text-xs text-[#6b7068]">
        {payment.payment?.provider ?? "--"}
      </span>
    </span>
  );
}

function BookingDetails({
  booking,
  actionId,
  onStatus,
  onMarkPaid,
}: {
  booking: Booking;
  actionId: string | null;
  onStatus: (bookingId: string, status: string) => void;
  onMarkPaid: (booking: Booking) => void;
}) {
  const range = parseRange(booking.time_range);
  const payment = getPaymentState(booking);

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#f6f7f2] p-4">
        <p className="text-lg font-black">{bookingCode(booking.id)}</p>
        <p className="mt-1 text-sm text-[#626860]">
          {range
            ? `${format(range.start, "MMM d, yyyy")} · ${formatRange(range.start, range.end)}`
            : "Time unavailable"}
        </p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Customer" value={booking.customers?.name ?? "Unknown"} />
        <Detail label="Court" value={booking.resources?.name ?? "No court"} />
        <Detail
          label="Booking type"
          value={booking.services?.name ?? "Manual"}
        />
        <Detail label="Status" value={booking.status.replace("_", " ")} />
        <Detail label="Payment" value={payment.label} />
        <Detail label="Amount" value={formatCurrency(booking.price_cents)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={booking.status === status ? "default" : "outline"}
            disabled={actionId === booking.id}
            onClick={() => onStatus(booking.id, status)}
          >
            {status.replace("_", " ")}
          </Button>
        ))}
        {payment.label !== "Paid" && (
          <Button
            size="sm"
            disabled={actionId === booking.id}
            onClick={() => onMarkPaid(booking)}
          >
            Mark paid
          </Button>
        )}
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

function CourtThumb() {
  return (
    <span className="relative block h-9 w-11 shrink-0 overflow-hidden rounded-lg bg-[#2c67a5]">
      <span className="absolute inset-x-0 bottom-0 h-4 bg-[#4d7a35]" />
      <span className="absolute top-1.5 right-1.5 left-1.5 h-6 rounded-sm border border-white/80" />
      <span className="absolute top-1.5 left-1/2 h-6 w-px bg-white/80" />
      <span className="absolute top-[18px] right-1.5 left-1.5 h-px bg-white/80" />
    </span>
  );
}
