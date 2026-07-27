"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the public booking page (p/[slug]).
 * Catches errors during page data fetch or rendering.
 * Provides retry + navigation back to the homepage.
 * Never exposes raw backend errors to visitors.
 */
export default function PublicPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center p-4 text-center">
      <div className="mb-3 text-3xl">⚠️</div>
      <h2 className="mb-1 text-lg font-semibold">
        This page isn&apos;t available right now
      </h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Something went wrong. Your booking information is safe. Please try
        again or come back later.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-6 w-full max-w-lg text-left">
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
    </main>
  );
}
