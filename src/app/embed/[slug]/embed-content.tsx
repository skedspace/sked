"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookingForm } from "@/components/booking/booking-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

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

export function PublicPageContent({
  slug,
  orgId,
  services,
  initialDate,
  initialService,
}: {
  slug: string;
  orgId: string;
  services: Service[];
  initialDate: string | null;
  initialService: string | null;
}) {
  const [selectedService, setSelectedService] = useState<string | null>(
    initialService ?? (services[0]?.id ?? null),
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate ?? new Date().toISOString().split("T")[0] ?? "",
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const supabase = createClient();

  const fetchSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setLoadingSlots(true);
    const { data } = await supabase.rpc("get_available_slots", {
      p_org_slug: slug,
      p_service_id: selectedService,
      p_date: selectedDate,
    });
    setSlots((data ?? []) as Slot[]);
    setLoadingSlots(false);
  }, [selectedService, selectedDate, slug, supabase]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const dates: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]!);
  }

  const currentService = services.find((s) => s.id === selectedService);

  return (
    <div className="space-y-4 text-sm">
      {/* Services */}
      <div className="grid grid-cols-2 gap-2">
        {services.map((svc) => (
          <Card
            key={svc.id}
            className={`cursor-pointer transition-colors ${
              selectedService === svc.id ? "border-primary ring-1 ring-primary" : ""
            }`}
            onClick={() => setSelectedService(svc.id)}
          >
            <CardContent className="p-3">
              <p className="text-xs font-semibold">{svc.name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(svc.price_cents)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduler */}
      {selectedService && (
        <>
          {/* Date picker */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {dates.map((d) => {
              const dateObj = new Date(d + "T12:00:00");
              const dayName = dateObj.toLocaleDateString("en-PH", { weekday: "short" });
              const dayNum = dateObj.getDate();
              const isToday = d === new Date().toISOString().split("T")[0];
              const isSelected = d === selectedDate;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`flex min-w-[48px] flex-col items-center rounded-lg border p-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <span>{dayName}</span>
                  <span className="text-sm font-bold">{dayNum}</span>
                  {isToday && <span className="text-[9px]">Today</span>}
                </button>
              );
            })}
          </div>

          {/* Slots */}
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : currentService ? (
            <BookingForm
              orgId={orgId}
              orgSlug={slug}
              service={currentService}
              slots={slots}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
