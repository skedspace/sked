"use client";

import { Button } from "@/components/ui/button";

/**
 * Shared error page for all settings sub-routes (locations, services, resources, hours, page).
 * Next.js error.tsx catches errors in the segment and its children automatically.
 */
export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
      <div className="mb-3 text-3xl">⚠️</div>
      <h2 className="mb-1 text-lg font-semibold">Settings error</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Something went wrong loading this page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
