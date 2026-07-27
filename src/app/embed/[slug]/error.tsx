"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the embed/public booking widget.
 * Renders minimal UI since this is shown inside an iframe on partner sites.
 * Never exposes raw backend errors.
 */
export default function EmbedWidgetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-3 text-2xl">⚠️</div>
      <h2 className="mb-1 text-sm font-semibold">Booking unavailable</h2>
      <p className="mb-4 max-w-xs text-xs text-muted-foreground">
        We can&apos;t load the booking widget right now. Please try again or
        contact the business directly.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 w-full max-w-md text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Error details
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-foreground/5 p-2 text-[10px]">
            {error.message}
            {"\n"}
            {error.digest && `Digest: ${error.digest}`}
          </pre>
        </details>
      )}
    </div>
  );
}
