"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import { useAnalytics } from "@/lib/analytics";

export function OrgSetupForm({ userId }: { userId: string }) {
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();
  const trackedStart = useRef(false);

  // Track onboarding_started once when the form first renders
  useEffect(() => {
    if (!trackedStart.current) {
      trackedStart.current = true;
      analytics.trackOnboardingStarted();
    }
  }, [analytics]);

  function handleNameChange(value: string) {
    setOrgName(value);
    if (!slug || slug === slugify(orgName)) {
      setSlug(slugify(value));
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
        throw new Error(data.error || "Something went wrong");
      }

      // Track page published after successful org creation
      if (data.org_id) {
        analytics.trackPagePublished(slug, data.org_id);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Business name */}
      <div className="space-y-2">
        <Label htmlFor="org-name">Business name</Label>
        <Input
          id="org-name"
          placeholder="e.g. Marco's Pickleball Courts"
          value={orgName}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      {/* Step 2: Your page link */}
      <div className="space-y-2">
        <Label htmlFor="slug">Your page link</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">sked.space/p/</span>
            <Input
              id="slug"
              placeholder="marco-pickleball"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              required
              pattern="^[a-z0-9-]+$"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {slug
              ? `Available at sked.space/p/${slug} and ${slug}.sked.space`
              : "Choose a web address for your public booking page."}
          </p>
        </div>
      </div>

      {/* Step 3: Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Default location name</Label>
        <Input
          id="location"
          placeholder="e.g. QC Main Branch"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating your page..." : "Create your page"}
      </Button>
    </form>
  );
}
