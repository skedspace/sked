"use client";

import { Button } from "@/components/ui/button";

/**
 * Global error page — catches errors in the root layout itself.
 * Must use <html> and <body> tags since the layout failed to render.
 *
 * SKED-styled: warm paper background, clear action.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="flex min-h-screen flex-col items-center justify-center p-8 antialiased"
        style={{ backgroundColor: "#f7f6ef", color: "#171a16" }}
      >
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: "#171a16" }}>
            Critical error
          </h1>
          <p className="mb-6" style={{ color: "#6e716b" }}>
            The application failed to load. Please refresh and try again.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
            <Button onClick={reset}>Try again</Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs" style={{ color: "#6e716b" }}>
                Error details
              </summary>
              <pre
                className="mt-2 overflow-auto rounded p-3 text-xs"
                style={{ backgroundColor: "rgb(23 26 22 / 0.05)" }}
              >
                {error.message}
                {"\n"}
                {error.digest && `Digest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
