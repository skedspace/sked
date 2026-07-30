"use client";

import {
  addDays,
  addMonths,
  addWeeks,
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
  Clock3,
  Filter,
  Grid2X2,
  Plus,
  UsersRound,
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

type Booking = {
  id: string;
  time_range: string;
  status: string;
  price_cents: number;
  source?: string | null;
  created_at?: string;
  customers: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  services: {
    id?: string;
    name: string;
    duration_min: number;
    price_cents?: number;
  } | null;
  resources: { id?: string; name: string } | null;
};

type Resource = {
  id: string;
  name: string;
  type?: string | null;
  capacity?: number | null;
};

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
};

type ViewMode = "week" | "day" | "month";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const BOOKING_PALETTE = [
  {
    bg: "bg-[#edf8df]",
    border: "border-[#dcefc6]",
    text: "text-[#143d0e]",
    dot: "bg-[#5a9d23]",
  },
  {
    bg: "bg-[#eef5ff]",
    border: "border-[#d8e8ff]",
    text: "text-[#173b74]",
    dot: "bg-[#7badf2]",
  },
  {
    bg: "bg-[#fff4dc]",
    border: "border-[#f3e3bd]",
    text: "text-[#704706]",
    dot: "bg-[#edaf35]",
  },
  {
    bg: "bg-[#f4eaf7]",
    border: "border-[#eadbef]",
    text: "text-[#523064]",
    dot: "bg-[#b086d2]",
  },
  {
    bg: "bg-[#fdeeee]",
    border: "border-[#f5dada]",
    text: "text-[#65302d]",
    dot: "bg-[#e59a96]",
  },
];

const STATUS_OPTIONS = [
  "held",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

function normalizeRangeDate(raw: string) {
  const trimmed = raw.trim().replace(" ", "T");
  const withOffset = /[+-]\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  return new Date(
    /[zZ]|[+-]\d{2}:\d{2}$/.test(withOffset) ? withOffset : `${withOffset}Z`,
  );
}

function parseTimeRange(range: string) {
  const match = range?.match(/\[([^,]+),([^\])]+)/);
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart || !rawEnd) return null;

  const start = normalizeRangeDate(rawStart);
  const end = normalizeRangeDate(rawEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return { start, end };
}

function formatHour(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatShortTime(date: Date) {
  return format(date, "h:mm a");
}

function formatRange(start: Date, end: Date) {
  return `${formatShortTime(start)} - ${formatShortTime(end)}`;
}

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getCapacity(resourceName?: string | null, resources?: Resource[]) {
  const resource = resources?.find((item) => item.name === resourceName);
  return resource?.capacity ?? (resourceName?.includes("3") ? 8 : 4);
}

function getBookingType(booking: Booking) {
  return booking.services?.name ?? "Manual booking";
}

function getColorIndex(value: string) {
  let total = 0;
  for (const char of value) total += char.charCodeAt(0);
  return total % BOOKING_PALETTE.length;
}

function makeManualRange(date: string, time: string, duration: number) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + duration * 60000);
  return { start, end };
}

export function CalendarView({
  bookings,
  resources,
  services,
  orgId,
  selectedDate,
  weekStart,
  weekEnd,
}: {
  bookings: Booking[];
  resources: Resource[];
  services: Service[];
  orgId: string;
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const [localBookings, setLocalBookings] = useState<Booking[]>(bookings);

  // Keep local state in sync when server props change (e.g. week navigation)
  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [courtFilter, setCourtFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    resourceId: resources[0]?.id ?? "",
    serviceId: services[0]?.id ?? "",
    date: dateParam(new Date(selectedDate)),
    time: "10:00",
  });

  // ── Conflict detection ──
  const bookingConflicts = useMemo(() => {
    if (!formState.resourceId || !formState.serviceId || !formState.date || !formState.time) return [];
    const service = services.find((s) => s.id === formState.serviceId);
    if (!service) return [];
    const start = new Date(`${formState.date}T${formState.time}:00`);
    const end = new Date(start.getTime() + service.duration_min * 60_000);
    return findConflicts(localBookings, formState.resourceId, start, end);
  }, [formState, localBookings, services]);

  const conflictWarning = useMemo(
    () => conflictMessage(bookingConflicts),
    [bookingConflicts],
  );

  // Auto-suggest earliest available time when resource/service/date changes
  // (skip first run — initial formState already has a default time)
  const initialRender = useRef(true);
  // Latest bookings/services are read through a ref so the effect below sees
  // fresh data without re-firing on every refresh and clobbering a manual pick.
  const suggestionData = useRef({ localBookings, services });
  useEffect(() => {
    suggestionData.current = { localBookings, services };
  }, [localBookings, services]);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (!formState.resourceId || !formState.serviceId) return;
    const { localBookings: latestBookings, services: latestServices } =
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

  const visibleDate = new Date(selectedDate);
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);
  const days = eachDayOfInterval({
    start: startDate,
    end: addDays(endDate, -1),
  });

  const parsedBookings = useMemo(
    () =>
      localBookings
        .map((booking) => ({
          booking,
          range: parseTimeRange(booking.time_range),
        }))
        .filter(
          (
            item,
          ): item is { booking: Booking; range: { start: Date; end: Date } } =>
            Boolean(item.range),
        ),
    [localBookings],
  );

  const bookingTypes = useMemo(
    () =>
      Array.from(
        new Set(parsedBookings.map(({ booking }) => getBookingType(booking))),
      ),
    [parsedBookings],
  );

  const filteredBookings = parsedBookings.filter(({ booking }) => {
    const matchesCourt =
      courtFilter === "all" ||
      booking.resources?.id === courtFilter ||
      booking.resources?.name ===
        resources.find((item) => item.id === courtFilter)?.name;
    const matchesType =
      typeFilter === "all" || getBookingType(booking) === typeFilter;
    const matchesStatus = showCancelled || booking.status !== "cancelled";
    return matchesCourt && matchesType && matchesStatus;
  });

  const totalCapacity = filteredBookings.reduce(
    (sum, { booking }) => sum + getCapacity(booking.resources?.name, resources),
    0,
  );
  const usedCapacity = filteredBookings.reduce((sum, { booking }) => {
    const capacity = getCapacity(booking.resources?.name, resources);
    return sum + Math.min(capacity, Math.max(1, Math.round(capacity * 0.85)));
  }, 0);
  const courtsInUse = resources.length
    ? Math.round(
        (new Set(filteredBookings.map(({ booking }) => booking.resources?.name))
          .size /
          resources.length) *
          100,
      )
    : 0;
  const utilization = totalCapacity
    ? Math.round((usedCapacity / totalCapacity) * 100)
    : courtsInUse;

  const hourCounts = filteredBookings.reduce<Record<number, number>>(
    (acc, { range }) => {
      const hour = range.start.getHours();
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const peakHour = Object.entries(hourCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const peakTime = peakHour
    ? `${Number(peakHour)}-${Number(peakHour) + 2} ${Number(peakHour) >= 12 ? "PM" : "AM"}`
    : "No bookings";

  const upcoming = filteredBookings
    .filter(({ range }) => range.start >= new Date())
    .sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
    .slice(0, 4);

  const miniMonthStart = startOfMonth(visibleDate);
  const miniDays = eachDayOfInterval({
    start: startOfWeek(miniMonthStart, { weekStartsOn: 1 }),
    end: addDays(startOfWeek(endOfMonth(visibleDate), { weekStartsOn: 1 }), 6),
  });

  function navigateTo(date: Date) {
    router.push(`/dashboard/calendar?date=${dateParam(date)}`);
  }

  async function handleStatus(bookingId: string, status: string) {
    setActionId(bookingId);
    await db.from("bookings").update({ status }).eq("id", bookingId);
    setActionId(null);
    setSelectedBooking(null);
    router.refresh();
  }

  async function handleManualBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError(null);

    const service = services.find((item) => item.id === formState.serviceId);
    const resource = resources.find((item) => item.id === formState.resourceId);
    if (!service || !resource || !formState.customerName.trim()) {
      setBookingError(
        "Choose a court, service, date, time, and customer name.",
      );
      return;
    }

    const { start, end } = makeManualRange(
      formState.date,
      formState.time,
      service.duration_min,
    );
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
          name: formState.customerName,
          email: formState.customerEmail || null,
          phone: formState.customerPhone || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        setActionId(null);
        setBookingError(error?.message ?? "Could not create the customer.");
        return;
      }
      customerId = data.id;
    }

    const { error } = await db.from("bookings").insert({
      org_id: orgId,
      resource_id: resource.id,
      service_id: service.id,
      customer_id: customerId,
      time_range: `[${start.toISOString()},${end.toISOString()})`,
      status: "confirmed",
      price_cents: service.price_cents,
      source: "manual",
      idempotency_key: crypto.randomUUID(),
    });

    setActionId(null);

    if (error) {
      setBookingError(
        error.message.includes("no_overlap_when_held_or_confirmed")
          ? "⚠ Double-booking prevented: That court is already booked at this time. Try a different time or court."
          : error.message,
      );
      return;
    }

    setBookingDialogOpen(false);
    navigateTo(start);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Calendar
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
              {format(startDate, "MMM d")} -{" "}
              {format(addDays(endDate, -1), "MMM d, yyyy")}
            </span>
          </button>
          <Button variant="outline" onClick={() => navigateTo(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => navigateTo(addWeeks(startDate, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => navigateTo(addWeeks(startDate, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={() => setBookingDialogOpen(true)}
          >
            <Plus />
            New booking
          </Button>
        </div>
      </header>


      <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1.85fr]">
        <StatCard
          icon={<CalendarDays className="h-7 w-7" />}
          label="Total bookings"
          value={String(filteredBookings.length)}
          detail={`${resources.length} court${resources.length !== 1 ? "s" : ""}`}
          tone="green"
        />
        <StatCard
          icon={<UsersRound className="h-7 w-7" />}
          label="Total customers"
          value={String(
            new Set(
              filteredBookings
                .map(({ booking }) => booking.customers?.name)
                .filter(Boolean),
            ).size,
          )}
          detail="Unique this week"
          tone="green"
        />
        <StatCard
          icon={<Grid2X2 className="h-7 w-7" />}
          label="Courts in use"
          value={`${utilization}%`}
          detail={`${new Set(filteredBookings.map(({ booking }) => booking.resources?.name)).size} of ${resources.length} courts`}
          tone="green"
        />
        <StatCard
          icon={<Clock3 className="h-7 w-7" />}
          label="Peak time"
          value={peakTime}
          detail="Most bookings"
          tone="amber"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="flex flex-col gap-3 border-b border-black/[0.07] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-grid w-fit grid-cols-3 rounded-xl border border-black/[0.08] bg-white p-0.5">
              {(["week", "day", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "h-9 min-w-24 rounded-lg px-4 text-sm font-semibold capitalize transition-colors",
                    viewMode === mode
                      ? "bg-[#eef8d2] text-[#171a16]"
                      : "text-[#5b6058] hover:bg-black/[0.04]",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <SelectLike
                icon={<Grid2X2 className="h-4 w-4" />}
                value={courtFilter}
                onChange={setCourtFilter}
                options={[
                  { value: "all", label: "All courts" },
                  ...resources.map((resource) => ({
                    value: resource.id,
                    label: resource.name,
                  })),
                ]}
              />
              <SelectLike
                icon={<Filter className="h-4 w-4" />}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "Filters" },
                  ...bookingTypes.map((type) => ({ value: type, label: type })),
                ]}
              />
            </div>
          </div>

          {viewMode === "month" ? (
            <MonthSummary
              days={miniDays}
              bookings={filteredBookings}
              visibleDate={visibleDate}
            />
          ) : (
            <WeekGrid
              bookings={filteredBookings}
              days={viewMode === "day" ? [visibleDate] : days}
              resources={resources}
              onSelect={setSelectedBooking}
            />
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#171a16]">
                Mini calendar
              </h2>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => navigateTo(addMonths(visibleDate, -1))}
              >
                <ChevronLeft />
              </Button>
              <p className="text-sm font-black">
                {format(visibleDate, "MMMM yyyy")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => navigateTo(addMonths(visibleDate, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold text-[#5d6259] uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-y-1 rounded-xl bg-[#f2f8dd] px-1 py-1">
              {miniDays.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => navigateTo(day)}
                  className={cn(
                    "grid h-8 place-items-center rounded-full text-xs font-bold transition-colors",
                    !isSameMonth(day, visibleDate) && "text-[#b8bbb3]",
                    isSameDay(day, visibleDate)
                      ? "bg-[#10120f] text-white"
                      : "hover:bg-white",
                    isToday(day) &&
                      !isSameDay(day, visibleDate) &&
                      "text-[#4c7a10]",
                  )}
                >
                  {format(day, "d")}
                </button>
              ))}
            </div>

            <div className="mt-7">
              <h3 className="text-sm font-black">Filter by</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <SelectLike
                  value={courtFilter}
                  onChange={setCourtFilter}
                  options={[
                    { value: "all", label: "All courts" },
                    ...resources.map((resource) => ({
                      value: resource.id,
                      label: resource.name,
                    })),
                  ]}
                />
                <SelectLike
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "all", label: "All booking types" },
                    ...bookingTypes.map((type) => ({
                      value: type,
                      label: type,
                    })),
                  ]}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-[#62665f]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                  checked={showCancelled}
                  onChange={(event) => setShowCancelled(event.target.checked)}
                />
                Show cancelled bookings
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Upcoming bookings</h2>
              <button
                className="text-xs font-bold text-[#547b14]"
                type="button"
                onClick={() => router.push("/dashboard/bookings")}
              >
                View all
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-[#747970]">
                  No upcoming bookings in this view.
                </p>
              ) : (
                upcoming.map(({ booking, range }) => {
                  const color =
                    BOOKING_PALETTE[getColorIndex(booking.id)] ??
                    BOOKING_PALETTE[0]!;
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setSelectedBooking(booking)}
                      className="grid w-full grid-cols-[64px_10px_1fr_auto] items-start gap-3 text-left"
                    >
                      <span className="text-[11px] leading-4 text-[#50554e]">
                        {formatShortTime(range.start)}
                        <br />- {formatShortTime(range.end)}
                      </span>
                      <span
                        className={cn("mt-2 h-2 w-2 rounded-full", color.dot)}
                      />
                      <span>
                        <span className="block text-xs font-black text-[#171a16]">
                          {getBookingType(booking)}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#5f645d]">
                          {booking.resources?.name ?? "Unassigned"}
                        </span>
                      </span>
                      <span className="rounded-full bg-[#f5f8ee] px-2 py-1 text-xs font-bold">
                        {getCapacity(booking.resources?.name, resources)} /{" "}
                        {getCapacity(booking.resources?.name, resources)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <Button
              className="mt-6 w-full bg-[#eff9d7] text-[#17370e] shadow-none hover:bg-[#e3f5bd]"
              onClick={() => setBookingDialogOpen(true)}
            >
              <Plus />
              New booking
            </Button>
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
              resources={resources}
              actionId={actionId}
              onStatus={handleStatus}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleManualBooking}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer-name">Customer name</Label>
              <Input
                id="customer-name"
                value={formState.customerName}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    customerName: event.target.value,
                  }))
                }
                required
                placeholder="Maya Chen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={formState.customerEmail}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    customerEmail: event.target.value,
                  }))
                }
                placeholder="maya@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
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
              id="booking-resource"
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
                label: `${service.name} (${service.duration_min} min)`,
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
            {conflictWarning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                {conflictWarning}
              </p>
            )}
            {bookingError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                {bookingError}
              </p>
            )}
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={actionId === "new-booking"}>
                {actionId === "new-booking" ? "Saving..." : "Create booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
  tone: "green" | "amber";
}) {
  return (
    <article className="flex min-h-36 items-center gap-6 rounded-2xl border border-black/[0.06] bg-white px-7 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full",
          tone === "green"
            ? "bg-[#ebf7d7] text-[#326d1e]"
            : "bg-[#fff1ce] text-[#e19a12]",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#1a1d18]">
          {label}
        </span>
        <span className="mt-2 block text-[30px] leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span className="mt-3 block text-xs font-semibold text-[#4c7c18]">
          {detail}
        </span>
      </span>
    </article>
  );
}

function SelectLike({
  icon,
  value,
  onChange,
  options,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative inline-flex h-10 min-w-40 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
      {icon && <span className="pointer-events-none ml-4">{icon}</span>}
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-3 text-xs font-bold outline-none"
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

function WeekGrid({
  bookings,
  days,
  resources,
  onSelect,
}: {
  bookings: Array<{ booking: Booking; range: { start: Date; end: Date } }>;
  days: Date[];
  resources: Resource[];
  onSelect: (booking: Booking) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[880px]"
        style={{
          gridTemplateColumns: `76px repeat(${days.length}, minmax(132px, 1fr))`,
        }}
      >
        <div className="border-b border-black/[0.07] bg-white" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="border-b border-l border-black/[0.07] px-3 py-4 text-center"
          >
            <p className="text-[10px] font-black text-[#1d211b] uppercase">
              {format(day, "EEE")}
            </p>
            <p
              className={cn(
                "mx-auto mt-1 grid h-8 w-fit min-w-8 place-items-center rounded-full px-2 text-sm font-black",
                isToday(day)
                  ? "bg-[#11130f] text-white"
                  : day.getDay() === 6
                    ? "text-[#2e891d]"
                    : day.getDay() === 0
                      ? "text-red-500"
                      : "text-[#080a07]",
              )}
            >
              {format(day, "MMM d")}
            </p>
          </div>
        ))}

        <div className="border-b border-black/[0.07] py-5 pr-3 text-right text-xs text-[#60655e]">
          All-day
        </div>
        {days.map((day) => (
          <div
            key={`${day.toISOString()}-all`}
            className="border-b border-l border-black/[0.07]"
          />
        ))}

        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            days={days}
            bookings={bookings}
            resources={resources}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function HourRow({
  hour,
  days,
  bookings,
  resources,
  onSelect,
}: {
  hour: number;
  days: Date[];
  bookings: Array<{ booking: Booking; range: { start: Date; end: Date } }>;
  resources: Resource[];
  onSelect: (booking: Booking) => void;
}) {
  return (
    <>
      <div className="h-14 border-b border-black/[0.07] py-3 pr-3 text-right text-xs text-[#5f655d]">
        {formatHour(hour)}
      </div>
      {days.map((day) => {
        const cellBookings = bookings.filter(
          ({ range }) =>
            isSameDay(range.start, day) && range.start.getHours() === hour,
        );

        return (
          <div
            key={`${day.toISOString()}-${hour}`}
            className="relative min-h-14 border-b border-l border-black/[0.07] bg-white"
          >
            {cellBookings.map(({ booking, range }) => {
              const color =
                BOOKING_PALETTE[getColorIndex(booking.id)] ??
                BOOKING_PALETTE[0]!;
              const top = Math.max(0, range.start.getMinutes() * 0.72);
              const minutes = Math.max(
                45,
                (range.end.getTime() - range.start.getTime()) / 60000,
              );
              const height = Math.min(104, Math.max(62, minutes * 0.78));

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => onSelect(booking)}
                  className={cn(
                    "absolute right-2 left-2 z-10 overflow-hidden rounded-lg border px-2 py-2 text-left shadow-sm transition hover:z-20 hover:-translate-y-0.5 hover:shadow-md",
                    color.bg,
                    color.border,
                    color.text,
                    booking.status === "cancelled" && "opacity-55",
                  )}
                  style={{ top, minHeight: height }}
                >
                  <span className="block text-[10px] leading-4 font-bold">
                    {formatRange(range.start, range.end)}
                  </span>
                  <span className="block truncate text-[11px] leading-4 font-black">
                    {getBookingType(booking)}
                  </span>
                  <span className="block truncate text-[10px] leading-4 font-bold">
                    {booking.resources?.name ?? "Unassigned"}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold">
                    {getCapacity(booking.resources?.name, resources)} /{" "}
                    {getCapacity(booking.resources?.name, resources)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function MonthSummary({
  days,
  bookings,
  visibleDate,
}: {
  days: Date[];
  bookings: Array<{ booking: Booking; range: { start: Date; end: Date } }>;
  visibleDate: Date;
}) {
  return (
    <div className="grid grid-cols-7 p-4">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
        <div
          key={day}
          className="px-2 py-2 text-xs font-black text-[#626860] uppercase"
        >
          {day}
        </div>
      ))}
      {days.map((day) => {
        const dayBookings = bookings.filter(({ range }) =>
          isSameDay(range.start, day),
        );
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "min-h-28 border border-black/[0.06] p-2",
              !isSameMonth(day, visibleDate) && "bg-[#fafafa] text-[#aaada8]",
            )}
          >
            <p
              className={cn(
                "text-xs font-black",
                isToday(day) && "text-[#3f7610]",
              )}
            >
              {format(day, "d")}
            </p>
            <div className="mt-2 space-y-1">
              {dayBookings.slice(0, 3).map(({ booking }) => (
                <p
                  key={booking.id}
                  className="truncate rounded-md bg-[#eef8d2] px-2 py-1 text-[10px] font-bold text-[#17370e]"
                >
                  {getBookingType(booking)}
                </p>
              ))}
              {dayBookings.length > 3 && (
                <p className="text-[10px] font-bold text-[#6a6f67]">
                  +{dayBookings.length - 3} more
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BookingDetails({
  booking,
  resources,
  actionId,
  onStatus,
}: {
  booking: Booking;
  resources: Resource[];
  actionId: string | null;
  onStatus: (bookingId: string, status: string) => void;
}) {
  const range = parseTimeRange(booking.time_range);

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#f6f7f2] p-4">
        <p className="text-lg font-black">{getBookingType(booking)}</p>
        <p className="mt-1 text-sm text-[#626860]">
          {range
            ? `${format(range.start, "MMM d, yyyy")} · ${formatRange(range.start, range.end)}`
            : "Time unavailable"}
        </p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Customer" value={booking.customers?.name ?? "Unknown"} />
        <Detail label="Court" value={booking.resources?.name ?? "Unassigned"} />
        <Detail label="Status" value={booking.status.replace("_", " ")} />
        <Detail
          label="Capacity"
          value={`${getCapacity(booking.resources?.name, resources)} players`}
        />
        <Detail label="Source" value={booking.source ?? "manual"} />
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
