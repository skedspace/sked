import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 page for the public booking flow.
 * Shown when a booking page slug doesn't exist or was unpublished.
 */
export default function PublicPageNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f6ef] p-8 text-center">
      <div className="schedule-grid pointer-events-none absolute inset-0 -z-10 opacity-35" />
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171a16] text-[#b9f34b]">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      </span>
      <h1 className="mb-3 text-3xl font-black tracking-[-0.04em]">
        Not available
      </h1>
      <p className="text-muted-foreground mb-6 max-w-sm leading-7">
        This business isn&apos;t currently accepting online bookings. Check
        back later or contact them directly.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
