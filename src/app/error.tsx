"use client";

import { Button } from "@/components/ui/button";

/**
 * Root error page — catches unhandled errors in any route segment
 * that doesn't have its own error.tsx.
 *
 * SKED-styled: calm, warm, actionable.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">
          We hit an unexpected error. Please try again. If the problem
          persists, contact support.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
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
    </main>
  );
}
