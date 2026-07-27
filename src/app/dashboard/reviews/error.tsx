"use client";

import { Button } from "@/components/ui/button";

export default function ReviewsError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
      <h2 className="mb-1 text-lg font-semibold">Couldn&apos;t load reviews</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Something went wrong loading your customer reviews.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
