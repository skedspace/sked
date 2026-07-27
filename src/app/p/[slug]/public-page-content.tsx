"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookingForm } from "@/components/booking/booking-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  payment_mode: string;
  deposit_cents?: number | null;
};

type Slot = {
  start_time: string;
  end_time: string;
  resource_id: string;
  resource_name: string;
};

function getDevSlots(date: string, durationMin: number): Slot[] {
  const starts = ["09:00", "10:30", "13:00", "14:30", "16:00", "18:00"];
  return starts.map((time, index) => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + durationMin * 60_000);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      resource_id: `dev-court-${(index % 4) + 1}`,
      resource_name: `Court ${(index % 4) + 1}`,
    };
  });
}

const PREVIEW_SERVICES: Service[] = [
  {
    id: "preview-service-1",
    name: "Court Booking",
    duration_min: 60,
    price_cents: 2000,
    payment_mode: "deposit",
    deposit_cents: 500,
  },
  {
    id: "preview-service-2",
    name: "Private Coaching",
    duration_min: 90,
    price_cents: 6000,
    payment_mode: "deposit",
    deposit_cents: 1500,
  },
];

export function PublicPageContent({
  slug,
  orgId,
  services,
  initialDate,
  initialService,
  isPreview = false,
  bookingCopy,
  tone = "light",
  primaryColor = "#b9f34b",
  inkColor = "#071420",
  mutedColor = "#53606b",
}: {
  slug: string;
  orgId: string;
  services: Service[];
  initialDate: string | null;
  initialService: string | null;
  isPreview?: boolean;
  bookingCopy?: {
    serviceTitle?: string;
    serviceHelper?: string;
    dateTimeTitle?: string;
    dateTimeHelper?: string;
    customerTitle?: string;
    customerHelper?: string;
    paymentTitle?: string;
    paymentHelper?: string;
    confirmationTitle?: string;
    confirmationHelper?: string;
  };
  tone?: "light" | "dark";
  primaryColor?: string;
  inkColor?: string;
  mutedColor?: string;
}) {
  const analytics = useAnalytics();
  const displayServices = useMemo(
    () => (services.length > 0 ? services : isPreview ? PREVIEW_SERVICES : []),
    [isPreview, services],
  );

  const today = useMemo(
    () => new Date().toISOString().split("T")[0] ?? "",
    [],
  );

  const [selectedService, setSelectedService] = useState<string | null>(
    initialService ?? displayServices[0]?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate ?? today,
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [players, setPlayers] = useState("4");
  const [hasSearched, setHasSearched] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedDuration =
    displayServices.find((s) => s.id === selectedService)?.duration_min ?? 60;

  const fetchSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setLoadingSlots(true);
    if (process.env.NODE_ENV !== "production") {
      setSlots(getDevSlots(selectedDate, selectedDuration));
      setLoadingSlots(false);
      return;
    }
    try {
      const db = createClient() as any;
      const { data } = await db.rpc("get_available_slots", {
        p_org_slug: slug,
        p_service_id: selectedService,
        p_date: selectedDate,
      });
      setSlots((data ?? []) as Slot[]);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, selectedDuration, selectedService, slug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const dates = useMemo(() => {
    const nextDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      nextDates.push(date.toISOString().split("T")[0]!);
    }
    return nextDates;
  }, []);

  const currentService = displayServices.find(
    (s) => s.id === selectedService,
  );
  const isDark = tone === "dark";
  const selectedTimeValue = selectedTime || slots[0]?.start_time || "";
  const visibleSlots = selectedTimeValue
    ? slots.filter((slot) => slot.start_time === selectedTimeValue)
    : slots;
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Select date";
  const selectedTimeLabel = selectedTimeValue
    ? new Date(selectedTimeValue).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : loadingSlots
      ? "Loading..."
      : "Select time";

  if (isDark) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-[0_26px_80px_rgba(0,0,0,0.32)] sm:p-8" style={{ color: inkColor }}>
        <div className="mb-7 flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-[0_10px_24px_rgba(7,20,32,0.18)]" style={{ backgroundColor: inkColor }}>
            <CalendarDays className="h-7 w-7" strokeWidth={1.7} />
          </span>
          <div>
            <h2 className="text-2xl font-black capitalize tracking-normal" style={{ color: inkColor }}>
              {bookingCopy?.serviceTitle ?? "Book Your Court"}
            </h2>
            {bookingCopy?.serviceHelper && (
              <p className="mt-1 text-base font-medium" style={{ color: mutedColor }}>
                {bookingCopy.serviceHelper}
              </p>
            )}
          </div>
        </div>

        {!hasSearched ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <BookingSelectField
                label="Date"
                icon={<CalendarDays />}
                value={selectedDate}
                displayValue={selectedDateLabel}
                onChange={(value) => {
                  setSelectedDate(value);
                  setSelectedTime("");
                  setHasSearched(false);
                }}
                options={dates.map((date) => ({
                  value: date,
                  label: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }),
                }))}
              />
              <BookingSelectField
                label="Time"
                icon={<Clock3 />}
                value={selectedTimeValue}
                displayValue={selectedTimeLabel}
                onChange={(value) => {
                  setSelectedTime(value);
                  setHasSearched(false);
                }}
                disabled={loadingSlots || slots.length === 0}
                options={slots.map((slot) => ({
                  value: slot.start_time,
                  label: new Date(slot.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                }))}
              />
              <BookingSelectField
                label="Duration"
                icon={<Timer />}
                value={selectedService ?? ""}
                displayValue={
                  currentService
                    ? `${formatDuration(currentService.duration_min)}`
                    : "Select duration"
                }
                onChange={(value) => {
                  const nextService = displayServices.find(
                    (service) => service.id === value,
                  );
                  setSelectedService(value);
                  setSelectedTime("");
                  setHasSearched(false);
                  if (nextService) {
                    analytics.trackServiceSelected(
                      nextService.id,
                      nextService.name,
                      nextService.payment_mode,
                    );
                  }
                }}
                options={displayServices.map((service) => ({
                  value: service.id,
                  label: formatDuration(service.duration_min),
                }))}
              />
              <BookingSelectField
                label="Players"
                icon={<UserRound />}
                value={players}
                displayValue={`${players} Players`}
                onChange={(value) => {
                  setPlayers(value);
                  setHasSearched(false);
                }}
                options={["1", "2", "3", "4", "5", "6", "7", "8"].map((value) => ({
                  value,
                  label: `${value} ${value === "1" ? "Player" : "Players"}`,
                }))}
              />
            </div>

            <button
              type="button"
              disabled={!currentService || loadingSlots || slots.length === 0}
              onClick={() => setHasSearched(true)}
              className="mt-7 flex min-h-14 w-full items-center justify-center rounded-xl px-5 text-base font-black text-white shadow-[0_14px_26px_rgba(7,20,32,0.18)] transition-colors disabled:cursor-not-allowed"
              style={{ backgroundColor: inkColor }}
            >
              {loadingSlots
                ? "Checking courts..."
                : slots.length === 0
                  ? "No courts available"
                  : bookingCopy?.dateTimeTitle ?? "Find Available Courts"}
            </button>

            {bookingCopy?.dateTimeHelper && (
              <div className="mt-3 flex items-center gap-3 text-sm font-medium text-[#53606b]">
                <ShieldCheck className="h-5 w-5 text-[#071420]" strokeWidth={1.7} />
                <span>{bookingCopy.dateTimeHelper}</span>
              </div>
            )}
            {!bookingCopy?.dateTimeHelper && (
              <div className="mt-7 flex items-center gap-3 text-sm font-medium text-[#53606b]">
                <ShieldCheck className="h-5 w-5 text-[#071420]" strokeWidth={1.7} />
                <span>Secure booking. Instant confirmation.</span>
              </div>
            )}
          </>
        ) : (
          currentService && (
            <BookingForm
              orgId={orgId}
              orgSlug={slug}
              service={currentService}
              slots={visibleSlots}
              primaryColor={primaryColor}
              inkColor={inkColor}
              mutedColor={mutedColor}
              bookingCopy={{
                customerTitle: bookingCopy?.customerTitle,
                customerHelper: bookingCopy?.customerHelper,
                paymentTitle: bookingCopy?.paymentTitle,
                paymentHelper: bookingCopy?.paymentHelper,
                confirmationTitle: bookingCopy?.confirmationTitle,
                confirmationHelper: bookingCopy?.confirmationHelper,
              }}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className={isDark ? "space-y-5 text-white" : "space-y-5"}>
      {/* ── Booking header from CMS ── */}
      {bookingCopy?.serviceTitle && (
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171a16] text-white shadow-sm">
            <CalendarDays className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#171a16]">{bookingCopy.serviceTitle}</h2>
            {bookingCopy.serviceHelper && (
              <p className="mt-0.5 text-sm font-medium text-[#6e716b]">{bookingCopy.serviceHelper}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Service row ── */}
      {displayServices.length > 0 && (
        <div>
          {displayServices.length === 1 ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.07] bg-white px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#171a16]">
                  {displayServices[0]!.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-[#8c9185]">
                  <Timer className="h-3 w-3" />
                  {displayServices[0]!.duration_min}m
                </span>
              </div>
              <span className="text-xs font-semibold text-[#57940e]">
                {formatCurrency(displayServices[0]!.price_cents)}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {displayServices.map((service) => {
                const isSelected = selectedService === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedService(service.id);
                      analytics.trackServiceSelected(
                        service.id,
                        service.name,
                        service.payment_mode,
                      );
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-[#75c51b] bg-[#75c51b] text-white"
                        : isDark
                          ? "border-white/15 bg-white/[0.06] text-white hover:border-white/30"
                          : "border-[#e5e7e0] bg-white text-[#171a16] hover:border-[#75c51b]"
                    }`}
                  >
                    <span>{service.name}</span>
                    <span className="ml-2 opacity-60">
                      {formatCurrency(service.price_cents)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Date strip (compact) ── */}
      {selectedService && (
        <div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {dates.map((date) => {
              const dateObj = new Date(`${date}T12:00:00`);
              const dayName = dateObj.toLocaleDateString("en-PH", {
                weekday: "short",
              });
              const dayNum = dateObj.getDate();
              const month = dateObj.toLocaleDateString("en-PH", {
                month: "short",
              });
              const isToday = date === today;
              const isSelected = date === selectedDate;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? isToday
                        ? "border-[#75c51b] bg-[#75c51b] text-white"
                        : isDark
                          ? "border-[#b9f34b] bg-[#b9f34b] text-[#071420]"
                          : "border-[#171a16] bg-[#171a16] text-white"
                      : isToday
                        ? isDark
                          ? "border-[#b9f34b]/30 bg-[#b9f34b]/8 text-[#b9f34b]"
                          : "border-[#75c51b]/30 bg-[#f0f9dd] text-[#75c51b]"
                        : isDark
                          ? "border-white/10 bg-white/[0.04] text-white hover:border-white/25"
                          : "border-[#e5e7e0] bg-white text-[#171a16] hover:border-[#75c51b]"
                  }`}
                >
                  {isToday && (
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Now
                    </span>
                  )}
                  <span className={isToday ? "" : ""}>
                    {dayName}
                  </span>
                  <span className="font-black">{dayNum}</span>
                  <span className="font-medium opacity-60">{month}</span>
                </button>
              );
            })}
          </div>

          {/* ── Slots / Form ── */}
          {loadingSlots ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-lg" />
              ))}
            </div>
          ) : currentService ? (
            <div className="mt-4">
              <BookingForm
                orgId={orgId}
                orgSlug={slug}
                service={currentService}
                slots={slots}
                primaryColor={primaryColor}
                inkColor={inkColor}
                mutedColor={mutedColor}
                bookingCopy={{
                  customerTitle: bookingCopy?.customerTitle,
                  customerHelper: bookingCopy?.customerHelper,
                  paymentTitle: bookingCopy?.paymentTitle,
                  paymentHelper: bookingCopy?.paymentHelper,
                  confirmationTitle: bookingCopy?.confirmationTitle,
                  confirmationHelper: bookingCopy?.confirmationHelper,
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      {!selectedService && displayServices.length === 0 && (
        <p className="py-8 text-center text-sm font-medium text-[#8c9185]">
          This business hasn&apos;t added any services yet. Check back soon.
        </p>
      )}
    </div>
  );
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
  }
  if (minutes > 60) return `${Number((minutes / 60).toFixed(1))} Hours`;
  return `${minutes} Minutes`;
}

function BookingSelectField({
  label,
  icon,
  value,
  displayValue,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  displayValue: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.04em] text-[#53606b]">
        {label}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#071420] [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full appearance-none rounded-lg border border-[#dfe5e9] bg-white pl-12 pr-11 text-sm font-black text-[#17212b] shadow-[0_4px_14px_rgba(7,20,32,0.04)] outline-none transition focus:border-[#071420] focus:ring-2 focus:ring-[#071420]/10 disabled:cursor-not-allowed disabled:bg-[#f3f5f6] disabled:text-[#8b969d]"
        >
          {options.length === 0 ? (
            <option value="">{displayValue}</option>
          ) : (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#53606b]" />
      </span>
    </label>
  );
}
