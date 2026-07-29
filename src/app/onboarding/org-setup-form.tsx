"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import { useAnalytics } from "@/lib/analytics";

type AvailabilityStatus =
  "idle" | "checking" | "available" | "unavailable" | "invalid" | "error";

export function OrgSetupForm({ termMonths }: { termMonths?: number | null }) {
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [locationName, setLocationName] = useState("");
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();
  const trackedStart = useRef(false);

  useEffect(() => {
    if (!trackedStart.current) {
      trackedStart.current = true;
      analytics.trackOnboardingStarted();
    }
  }, [analytics]);

  useEffect(() => {
    const controller = new AbortController();
    const normalizedSlug = slugify(slug);

    if (!normalizedSlug) {
      setAvailability("idle");
      setAvailabilityMessage("");
      return () => controller.abort();
    }

    if (normalizedSlug.length < 3) {
      setAvailability("invalid");
      setAvailabilityMessage("Use at least 3 characters.");
      return () => controller.abort();
    }

    setAvailability("checking");
    setAvailabilityMessage("Checking...");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/onboarding?slug=${encodeURIComponent(normalizedSlug)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          available?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Could not check this address");
        }

        if (data.available) {
          setAvailability("available");
          setAvailabilityMessage("Available");
        } else {
          setAvailability("unavailable");
          setAvailabilityMessage("Already taken");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAvailability("error");
        setAvailabilityMessage("We’ll check again when you continue.");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  function handleNameChange(value: string) {
    setOrgName(value);
    if (!slug || slug === slugify(orgName)) {
      setSlug(slugify(value).slice(0, 48));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, slug, locationName }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setAvailability("unavailable");
          setAvailabilityMessage("Already taken");
        }
        throw new Error(data.error || "Something went wrong");
      }

      if (data.org_id) {
        analytics.trackPagePublished(slug, data.org_id);
      }

      if (termMonths && [1, 12, 24, 36].includes(termMonths)) {
        const checkout = await fetch("/api/platform-subscriptions/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ termMonths }),
        });
        const checkoutData = await checkout.json();
        if (!checkout.ok || !checkoutData.checkoutUrl) {
          throw new Error(
            checkoutData.error ||
              "Your organization was created, but checkout could not be started.",
          );
        }
        window.location.href = checkoutData.checkoutUrl;
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const cannotSubmit =
    loading ||
    !orgName.trim() ||
    !slug ||
    ["checking", "unavailable", "invalid"].includes(availability);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="org-name">Business or team name</Label>
        <Input
          id="org-name"
          placeholder="e.g. Rally Point Pickleball"
          autoComplete="organization"
          value={orgName}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="slug">Business page</Label>
          <span className="text-muted-foreground text-xs">
            {availability === "idle" ? "Check availability" : ""}
          </span>
        </div>
        <div className="flex min-h-11 items-center overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-colors focus-within:border-black/30 focus-within:ring-2 focus-within:ring-[#86bd24]/30">
          <input
            id="slug"
            aria-label="Business subdomain"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value).slice(0, 48))}
            required
            minLength={3}
            maxLength={48}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            placeholder="businessname"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2.5 pl-3.5 text-right text-sm font-semibold outline-none placeholder:font-normal"
          />
          <span className="shrink-0 pr-3.5 text-sm font-medium text-[#74776f]">
            .sked.space
          </span>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`flex min-h-5 items-center gap-2 text-xs font-medium ${
            availability === "available"
              ? "text-[#527c0c]"
              : availability === "unavailable" || availability === "invalid"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {availability === "checking" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {availability === "available" && (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {(availability === "unavailable" || availability === "invalid") && (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {availabilityMessage || "Enter a business name"}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="location">First location</Label>
          <span className="text-muted-foreground text-xs">Optional</span>
        </div>
        <div className="relative">
          <MapPin
            aria-hidden
            className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
          />
          <Input
            id="location"
            placeholder="e.g. Main Branch"
            autoComplete="off"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl border px-3.5 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={cannotSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Creating your workspace...
          </>
        ) : (
          <>
            Create my workspace
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
