"use client";

import { Button } from "@/components/ui/button";

export default function CustomersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
      <div className="mb-3 text-3xl">⚠️</div>
      <h2 className="mb-1 text-lg font-semibold">
        Couldn&apos;t load customers
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Something went wrong loading your customer list.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
