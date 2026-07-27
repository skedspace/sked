"use client";

import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Grid2X2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

type Court = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  is_active: boolean;
  location_id: string;
  locations: { id?: string; name: string; address: string | null } | null;
};

type Location = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
};

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
};

type ServiceLink = {
  service_id: string;
  resource_id: string;
};

type Booking = {
  id: string;
  resource_id: string;
  time_range: string;
  status: string;
};

type OperatingHour = {
  location_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
};

type CourtFormState = {
  id: string | null;
  name: string;
  type: string;
  capacity: string;
  isActive: boolean;
  locationMode: "existing" | "new";
  locationId: string;
  locationName: string;
  locationAddress: string;
  serviceIds: string[];
};

const SURFACE_OPTIONS = [
  "Outdoor - Hard Court",
  "Indoor - Pro Surface",
  "Outdoor - Acrylic",
  "Indoor - Cushion",
];

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseRange(range: string) {
  const match = range?.match(/\[([^,]+),([^\])]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  const start = new Date(match[1].trim().replace(" ", "T"));
  const end = new Date(match[2].trim().replace(" ", "T"));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function bookingMinutes(bookings: Booking[]) {
  return bookings.reduce((total, booking) => {
    const range = parseRange(booking.time_range);
    if (!range) return total;
    return (
      total + Math.max(0, (range.end.getTime() - range.start.getTime()) / 60000)
    );
  }, 0);
}

function initialForm(
  court: Court | null,
  locations: Location[],
  links: ServiceLink[],
) {
  return {
    id: court?.id ?? null,
    name: court?.name ?? "",
    type: court?.type ?? SURFACE_OPTIONS[0]!,
    capacity: String(court?.capacity ?? 4),
    isActive: court?.is_active ?? true,
    locationMode:
      locations.length > 0 ? ("existing" as const) : ("new" as const),
    locationId: court?.location_id ?? locations[0]?.id ?? "",
    locationName: "",
    locationAddress: "",
    serviceIds: court
      ? links
          .filter((link) => link.resource_id === court.id)
          .map((link) => link.service_id)
      : [],
  };
}

export function CourtsView({
  orgId,
  selectedDate,
  weekStart,
  weekEnd,
  resources,
  locations,
  services,
  serviceLinks,
  weekBookings,
  todayBookings,
  operatingHours,
}: {
  orgId: string;
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
  resources: Court[];
  locations: Location[];
  services: Service[];
  serviceLinks: ServiceLink[];
  weekBookings: Booking[];
  todayBookings: Booking[];
  operatingHours: OperatingHour[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCourtId, setSelectedCourtId] = useState(
    resources[0]?.id ?? "",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<CourtFormState>(() =>
    initialForm(null, locations, serviceLinks),
  );

  const selected =
    resources.find((court) => court.id === selectedCourtId) ??
    resources[0] ??
    null;
  const selectedDateValue = new Date(selectedDate);
  const weekStartValue = new Date(weekStart);
  const weekEndValue = new Date(weekEnd);
  const weekDays = eachDayOfInterval({
    start: weekStartValue,
    end: addDays(weekEndValue, -1),
  });

  const courtMetrics = useMemo(() => {
    return resources.map((court) => {
      const courtBookings = weekBookings.filter(
        (booking) =>
          booking.resource_id === court.id &&
          booking.status !== "cancelled" &&
          booking.status !== "no_show",
      );
      const booked = bookingMinutes(courtBookings);
      const hours = operatingHours.filter(
        (hour) => hour.location_id === court.location_id && hour.is_active,
      );
      const available = hours.reduce(
        (total, hour) =>
          total +
          Math.max(
            0,
            timeToMinutes(hour.closes_at) - timeToMinutes(hour.opens_at),
          ),
        0,
      );
      const utilization =
        available > 0
          ? Math.min(100, Math.round((booked / available) * 100))
          : 0;
      const linkedServices = serviceLinks
        .filter((link) => link.resource_id === court.id)
        .map((link) =>
          services.find((service) => service.id === link.service_id),
        )
        .filter((service): service is Service => Boolean(service));
      const hourlyPrices = linkedServices
        .map((service) =>
          service.duration_min > 0
            ? (service.price_cents / service.duration_min) * 60
            : 0,
        )
        .filter((price) => price > 0);
      const priceCents = hourlyPrices.length ? Math.min(...hourlyPrices) : null;

      return { court, utilization, priceCents, linkedServices };
    });
  }, [resources, services, serviceLinks, operatingHours, weekBookings]);

  const filteredMetrics = courtMetrics.filter(({ court }) => {
    const haystack =
      `${court.name} ${court.type} ${court.locations?.name ?? ""} ${court.locations?.address ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesLocation =
      locationFilter === "all" || court.location_id === locationFilter;
    const courtStatus = court.is_active ? "active" : "inactive";
    const matchesStatus =
      statusFilter === "all" ||
      statusFilter === courtStatus ||
      (statusFilter === "maintenance" &&
        court.type.toLowerCase().includes("maintenance"));
    return matchesQuery && matchesLocation && matchesStatus;
  });

  const activeCount = resources.filter((court) => court.is_active).length;
  const averageUtilization = courtMetrics.length
    ? Math.round(
        courtMetrics.reduce((sum, item) => sum + item.utilization, 0) /
          courtMetrics.length,
      )
    : 0;
  const needsAttention = courtMetrics.filter(
    ({ court }) =>
      !court.is_active || court.type.toLowerCase().includes("maintenance"),
  );

  const dailyUtilization = weekDays.map((day) => {
    const dayBookings = weekBookings.filter((booking) => {
      const range = parseRange(booking.time_range);
      return (
        range && isSameDay(range.start, day) && booking.status !== "cancelled"
      );
    });
    const booked = bookingMinutes(dayBookings);
    const open = resources.reduce((total, court) => {
      const hour = operatingHours.find(
        (item) =>
          item.location_id === court.location_id &&
          item.weekday === day.getDay() &&
          item.is_active,
      );
      if (!hour) return total;
      return (
        total +
        Math.max(
          0,
          timeToMinutes(hour.closes_at) - timeToMinutes(hour.opens_at),
        )
      );
    }, 0);
    return {
      day,
      value: open > 0 ? Math.min(100, Math.round((booked / open) * 100)) : 0,
    };
  });

  function navigateTo(date: Date) {
    router.push(`/dashboard/courts?date=${dateParam(date)}`);
  }

  function openAddDialog() {
    setFormError(null);
    setFormState(initialForm(null, locations, serviceLinks));
    setFormOpen(true);
  }

  function openEditDialog(court: Court) {
    setFormError(null);
    setSelectedCourtId(court.id);
    setFormState(initialForm(court, locations, serviceLinks));
    setFormOpen(true);
  }

  async function handleToggleActive(court: Court) {
    setSaving(true);
    await db
      .from("resources")
      .update({ is_active: !court.is_active })
      .eq("id", court.id);
    setSaving(false);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    let locationId = formState.locationId;
    if (formState.locationMode === "new") {
      if (!formState.locationName.trim()) {
        setSaving(false);
        setFormError("Add a location name or choose an existing location.");
        return;
      }

      const { data, error } = await db
        .from("locations")
        .insert({
          org_id: orgId,
          name: formState.locationName.trim(),
          address: formState.locationAddress.trim() || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        setSaving(false);
        setFormError(error?.message ?? "Could not create the location.");
        return;
      }

      locationId = data.id;
    }

    if (!locationId) {
      setSaving(false);
      setFormError("Choose a location for this court.");
      return;
    }

    const payload = {
      org_id: orgId,
      location_id: locationId,
      name: formState.name.trim(),
      type: formState.type,
      capacity: Math.max(1, Number.parseInt(formState.capacity, 10) || 1),
      is_active: formState.isActive,
    };

    let resourceId = formState.id;
    if (formState.id) {
      const { error } = await db
        .from("resources")
        .update(payload)
        .eq("id", formState.id);
      if (error) {
        setSaving(false);
        setFormError(error.message);
        return;
      }
    } else {
      const { data, error } = await db
        .from("resources")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setSaving(false);
        setFormError(error?.message ?? "Could not create the court.");
        return;
      }
      resourceId = data.id;
    }

    await db.from("service_resources").delete().eq("resource_id", resourceId);
    if (formState.serviceIds.length > 0) {
      const { error } = await db.from("service_resources").insert(
        formState.serviceIds.map((serviceId) => ({
          resource_id: resourceId,
          service_id: serviceId,
        })),
      );
      if (error) {
        setSaving(false);
        setFormError(error.message);
        return;
      }
    }

    setSaving(false);
    setFormOpen(false);
    if (resourceId) setSelectedCourtId(resourceId);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Courts
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Manage your courts, availability and settings.
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
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => navigateTo(addWeeks(weekStartValue, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => navigateTo(addWeeks(weekStartValue, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openAddDialog}
          >
            <Plus />
            Add court
          </Button>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={<Grid2X2 className="h-7 w-7" />}
          label="Total Courts"
          value={String(resources.length)}
          detail={`${locations.length} location${locations.length === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-7 w-7" />}
          label="Active Courts"
          value={String(activeCount)}
          detail={
            resources.length
              ? `${Math.round((activeCount / resources.length) * 100)}% of total`
              : "No courts yet"
          }
        />
        <StatCard
          icon={<CalendarDays className="h-7 w-7" />}
          label="Today's Bookings"
          value={String(
            todayBookings.filter((booking) => booking.status !== "cancelled")
              .length,
          )}
          detail="Across all courts"
        />
        <StatCard
          icon={<Clock3 className="h-7 w-7" />}
          label="Court Utilization"
          value={`${averageUtilization}%`}
          detail="This week average"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="p-6">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              All Courts
            </h2>
            <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search courts by name or location..."
                  className="pl-11"
                />
              </label>
              {showFilters && (
                <>
                  <SelectField
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={[
                      { value: "all", label: "All locations" },
                      ...locations.map((location) => ({
                        value: location.id,
                        label: location.name,
                      })),
                    ]}
                  />
                  <SelectField
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "maintenance", label: "Maintenance" },
                    ]}
                  />
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                aria-label="Filters"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
                  <th className="px-6 py-4">Court</th>
                  <th className="px-4 py-4">Location</th>
                  <th className="px-4 py-4">Surface</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Price / Hour</th>
                  <th className="px-4 py-4">Utilization</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-sm text-[#6b7068]"
                    >
                      {resources.length === 0
                        ? "No courts yet. Add your first court to start managing availability."
                        : "No courts match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredMetrics.map(({ court, utilization, priceCents }) => (
                    <tr
                      key={court.id}
                      className={cn(
                        "border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]",
                        selected?.id === court.id && "bg-[#fbfcf7]",
                      )}
                    >
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          className="flex items-center gap-4 text-left"
                          onClick={() => setSelectedCourtId(court.id)}
                        >
                          <CourtThumb inactive={!court.is_active} />
                          <span>
                            <span className="font-black text-[#171a16]">
                              {court.name}
                            </span>
                            {resources[0]?.id === court.id && (
                              <Badge className="ml-2 bg-[#eff9d7] text-[#407414] shadow-none">
                                Main
                              </Badge>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-[#171a16]">
                          {court.locations?.name ?? "No location"}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7068]">
                          {court.locations?.address ?? "Address not set"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-[#171a16]">
                          {court.type.split(" - ")[0] ?? court.type}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7068]">
                          {court.type.split(" - ")[1] ?? "Surface not set"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill court={court} />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold">
                        {priceCents === null
                          ? "Not set"
                          : formatCurrency(priceCents)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 text-sm font-bold">
                            {utilization}%
                          </span>
                          <span className="h-1.5 w-24 rounded-full bg-[#e6e5de]">
                            <span
                              className="block h-full rounded-full bg-[#62c51c]"
                              style={{ width: `${utilization}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Edit ${court.name}`}
                            onClick={() => openEditDialog(court)}
                          >
                            <MoreHorizontal />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-5 text-sm text-[#626860]">
            Showing {filteredMetrics.length} of {resources.length} courts
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Court preview</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous court"
                  disabled={resources.length < 2}
                  onClick={() => {
                    const index = resources.findIndex(
                      (court) => court.id === selected?.id,
                    );
                    const nextIndex =
                      index <= 0 ? resources.length - 1 : index - 1;
                    setSelectedCourtId(resources[nextIndex]?.id ?? "");
                  }}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next court"
                  disabled={resources.length < 2}
                  onClick={() => {
                    const index = resources.findIndex(
                      (court) => court.id === selected?.id,
                    );
                    const nextIndex =
                      index >= resources.length - 1 ? 0 : index + 1;
                    setSelectedCourtId(resources[nextIndex]?.id ?? "");
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            {selected ? (
              <div className="mt-4">
                <CourtPreviewArt court={selected} />
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-lg font-black">{selected.name}</h3>
                  <StatusPill court={selected} compact />
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-[#636860]">
                  <MapPin className="h-4 w-4" />
                  {selected.locations?.name ?? "No location"}
                  {selected.locations?.address
                    ? `, ${selected.locations.address}`
                    : ""}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-[#636860]">
                  <Grid2X2 className="h-4 w-4" />
                  {selected.type} · {selected.capacity} player capacity
                </p>
                <div className="mt-5 grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(selected)}
                  >
                    <Edit3 />
                    Edit court details
                  </Button>
                  <Button
                    variant={selected.is_active ? "outline" : "default"}
                    disabled={saving}
                    onClick={() => handleToggleActive(selected)}
                  >
                    {selected.is_active ? "Mark inactive" : "Reactivate court"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-8 text-sm text-[#6b7068]">
                Add a court to see its live preview and controls.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Utilization this week</h2>
              <SelectField
                value="this-week"
                onChange={() => undefined}
                options={[{ value: "this-week", label: "This week" }]}
                compact
              />
            </div>
            <div className="mt-6 grid h-36 grid-cols-7 items-end gap-3 border-b border-[#e5e5de]">
              {dailyUtilization.map(({ day, value }) => (
                <div
                  key={day.toISOString()}
                  className="flex h-full flex-col items-center justify-end gap-2"
                >
                  <span className="text-[11px] font-bold text-[#4f554d]">
                    {value}%
                  </span>
                  <span
                    className="w-7 rounded-t-md bg-[#72d322]"
                    style={{ height: `${Math.max(4, value)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-3 text-center text-[11px] font-bold">
              {dailyUtilization.map(({ day }) => (
                <span key={day.toISOString()}>{format(day, "EEE")}</span>
              ))}
            </div>
            <p className="mt-3 text-right text-xs font-bold text-[#4d8715]">
              Avg {averageUtilization}%
            </p>
          </section>

          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Upcoming maintenance</h2>
              <button
                type="button"
                className="text-xs font-bold text-[#547b14]"
                onClick={() => {
                  setLocationFilter("all");
                  setStatusFilter("all");
                  setQuery("");
                }}
              >
                View all
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {needsAttention.length === 0 ? (
                <p className="text-sm text-[#6b7068]">
                  No inactive or maintenance-marked courts right now.
                </p>
              ) : (
                needsAttention.slice(0, 3).map(({ court }) => (
                  <div key={court.id} className="flex gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0db] text-[#f08a00]">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black">{court.name}</p>
                      <p className="mt-1 text-xs text-[#6b7068]">
                        {court.is_active ? court.type : "Court is inactive"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {formState.id ? "Edit court" : "Add court"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="court-name">Court name</Label>
              <Input
                id="court-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                placeholder="Court 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="court-capacity">Capacity</Label>
              <Input
                id="court-capacity"
                type="number"
                min={1}
                value={formState.capacity}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    capacity: event.target.value,
                  }))
                }
                required
              />
            </div>
            <FieldSelect
              id="court-surface"
              label="Surface"
              value={formState.type}
              onChange={(value) =>
                setFormState((state) => ({ ...state, type: value }))
              }
              options={SURFACE_OPTIONS.map((surface) => ({
                value: surface,
                label: surface,
              }))}
            />
            <FieldSelect
              id="court-status"
              label="Status"
              value={formState.isActive ? "active" : "inactive"}
              onChange={(value) =>
                setFormState((state) => ({
                  ...state,
                  isActive: value === "active",
                }))
              }
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />

            <div className="space-y-3 sm:col-span-2">
              <Label>Location</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {locations.length > 0 && (
                  <label className="flex items-center gap-2 rounded-xl border border-black/10 p-3 text-sm font-semibold">
                    <input
                      type="radio"
                      checked={formState.locationMode === "existing"}
                      onChange={() =>
                        setFormState((state) => ({
                          ...state,
                          locationMode: "existing",
                        }))
                      }
                    />
                    Existing location
                  </label>
                )}
                <label className="flex items-center gap-2 rounded-xl border border-black/10 p-3 text-sm font-semibold">
                  <input
                    type="radio"
                    checked={formState.locationMode === "new"}
                    onChange={() =>
                      setFormState((state) => ({
                        ...state,
                        locationMode: "new",
                      }))
                    }
                  />
                  New location
                </label>
              </div>
              {formState.locationMode === "existing" ? (
                <FieldSelect
                  id="court-location"
                  label="Choose location"
                  value={formState.locationId}
                  onChange={(value) =>
                    setFormState((state) => ({ ...state, locationId: value }))
                  }
                  options={locations.map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={formState.locationName}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        locationName: event.target.value,
                      }))
                    }
                    placeholder="Location name"
                  />
                  <Input
                    value={formState.locationAddress}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        locationAddress: event.target.value,
                      }))
                    }
                    placeholder="Address"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 sm:col-span-2">
              <Label>Bookable services</Label>
              {services.length === 0 ? (
                <p className="rounded-xl border border-black/10 bg-[#fbfaf7] p-3 text-sm text-[#6b7068]">
                  No services yet. Add services in Settings to attach prices and
                  booking types.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm"
                    >
                      <span>
                        <span className="block font-bold">{service.name}</span>
                        <span className="text-xs text-[#6b7068]">
                          {formatCurrency(service.price_cents)} ·{" "}
                          {service.duration_min} min
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={formState.serviceIds.includes(service.id)}
                        onChange={(event) =>
                          setFormState((state) => ({
                            ...state,
                            serviceIds: event.target.checked
                              ? [...state.serviceIds, service.id]
                              : state.serviceIds.filter(
                                  (id) => id !== service.id,
                                ),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
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
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : formState.id
                    ? "Save changes"
                    : "Add court"}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="flex min-h-32 items-center gap-6 rounded-2xl border border-black/[0.06] bg-white px-7 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#ebf7d7] text-[#326d1e]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#1a1d18]">
          {label}
        </span>
        <span className="mt-2 block text-[30px] leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span className="mt-3 block text-xs font-semibold text-[#5f655d]">
          {detail}
        </span>
      </span>
    </article>
  );
}

function StatusPill({
  court,
  compact = false,
}: {
  court: Court;
  compact?: boolean;
}) {
  const maintenance = court.type.toLowerCase().includes("maintenance");
  const label = maintenance
    ? "Maintenance"
    : court.is_active
      ? "Active"
      : "Inactive";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold",
        compact ? "rounded-full bg-[#eff9d7] px-2.5 py-1 text-xs" : "text-sm",
        maintenance
          ? "text-[#e58a00]"
          : court.is_active
            ? "text-[#389219]"
            : "text-[#787d75]",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          maintenance
            ? "bg-[#f4a21c]"
            : court.is_active
              ? "bg-[#62c51c]"
              : "bg-[#c8cac4]",
        )}
      />
      {label}
    </span>
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
        "relative inline-flex h-11 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm",
        compact ? "min-w-28" : "min-w-44",
      )}
    >
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-10 pl-4 text-xs font-bold outline-none"
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

function CourtThumb({ inactive = false }: { inactive?: boolean }) {
  return (
    <span
      className={cn(
        "relative block h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-[#2c67a5]",
        inactive && "grayscale",
      )}
    >
      <span className="absolute inset-x-0 bottom-0 h-5 bg-[#4d7a35]" />
      <span className="absolute top-2 right-2 left-2 h-7 rounded-sm border border-white/80" />
      <span className="absolute top-2 left-1/2 h-7 w-px bg-white/80" />
      <span className="absolute top-[22px] right-2 left-2 h-px bg-white/80" />
    </span>
  );
}

function CourtPreviewArt({ court }: { court: Court }) {
  return (
    <div
      className={cn(
        "relative h-48 overflow-hidden rounded-xl bg-[#2f76b6]",
        !court.is_active && "grayscale",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#b9d5ec] to-[#d6edf8]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-[#527b3b]" />
      <div className="absolute top-16 right-8 left-8 h-24 skew-y-[-8deg] border-2 border-white bg-[#236db5] shadow-xl">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white" />
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white" />
        <div className="absolute top-0 left-1/4 h-full w-0.5 bg-white/80" />
        <div className="absolute top-0 right-1/4 h-full w-0.5 bg-white/80" />
      </div>
      <div className="absolute top-[92px] right-4 left-4 h-2 bg-[#101914]/70" />
      <p className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#171a16]">
        {court.name}
      </p>
    </div>
  );
}
