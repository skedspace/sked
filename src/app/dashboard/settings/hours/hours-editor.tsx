"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Location = { id: string; name: string };
type HourRow = {
  id?: string;
  location_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
};

export function HoursEditor({ locations }: { locations: Location[] }) {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id ?? "");
  const [hours, setHours] = useState<HourRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  // Memoized so the client identity is stable across renders and can safely be
  // listed as a hook dependency.
  const supabase = useMemo(() => createClient(), []);

  const loadHours = useCallback(async () => {
    setLoadingInitial(true);
    const { data } = await supabase
      .from("operating_hours")
      .select("*")
      .eq("location_id", selectedLocation);

    if (data && data.length > 0) {
      setHours(data);
    } else {
      // Initialize with defaults
      setHours(
        DAYS.map((_, i) => ({
          location_id: selectedLocation,
          weekday: i,
          opens_at: "08:00",
          closes_at: "17:00",
          is_active: i !== 0, // closed on Sunday by default
        })),
      );
    }
    setLoadingInitial(false);
  }, [supabase, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation) {
      setLoadingInitial(false);
      return;
    }
    loadHours();
  }, [selectedLocation, loadHours]);

  function updateHour(weekday: number, field: "opens_at" | "closes_at" | "is_active", value: string | boolean) {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, [field]: value } : h)),
    );
  }

  async function handleSave() {
    setLoading(true);
    setSaveError(null);
    setSaved(false);

    // Upsert each day's hours
    for (const row of hours) {
      if (row.id) {
        const { error: updateErr } = await supabase
          .from("operating_hours")
          .update({
            opens_at: row.opens_at,
            closes_at: row.closes_at,
            is_active: row.is_active,
          })
          .eq("id", row.id);
        if (updateErr) {
          setSaveError(updateErr.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: insertErr } = await supabase.from("operating_hours").insert({
          location_id: selectedLocation,
          weekday: row.weekday,
          opens_at: row.opens_at,
          closes_at: row.closes_at,
          is_active: row.is_active,
        });
        if (insertErr) {
          setSaveError(insertErr.message);
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {loadingInitial ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-10 w-32 rounded-[12px]" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-10 w-32 rounded-[12px]" />
              </CardContent>
            </Card>
          ))
        ) : (
          hours.map((row) => (
            <Card key={row.weekday}>
              <CardContent className="flex items-center gap-4 p-4">
                <label className="flex w-8 items-center">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) =>
                      updateHour(row.weekday, "is_active", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </label>
                <span className="w-28 text-sm font-medium">
                  {DAYS[row.weekday]}
                </span>
                {row.is_active ? (
                  <>
                    <Input
                      type="time"
                      value={row.opens_at}
                      onChange={(e) =>
                        updateHour(row.weekday, "opens_at", e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={row.closes_at}
                      onChange={(e) =>
                        updateHour(row.weekday, "closes_at", e.target.value)
                      }
                      className="w-32"
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {saved ? "Saved!" : loading ? "Saving..." : "Save hours"}
      </Button>
    </div>
  );
}
