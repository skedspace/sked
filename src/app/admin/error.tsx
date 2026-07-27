"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the admin dashboard.
 * Catches errors in admin routes and provides recovery options.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="mb-3 text-3xl">⚠️</div>
      <h2 className="mb-1 text-lg font-semibold">Admin dashboard error</h2>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Something went wrong loading the admin panel. Please try again, or go
        back to the overview.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
          Go to admin
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 max-w-lg text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Error details
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-foreground/5 p-3 text-xs">
            {error.message}
            {"\n"}
            {error.digest && `Digest: ${error.digest}`}
          </pre>
        </details>
      )}
    </div>
  );
}
