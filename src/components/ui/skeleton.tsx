"use client";

import { cn } from "@/lib/utils";

/**
 * SKED-styled skeleton placeholder.
 *
 * Follows the SKED design system:
 * - Foreground (ink) at 10% opacity — follows the "ink at 8–14%" rule
 * - 12px radius for control-sized blocks, 16px for cards
 * - Smooth pulse that respects prefers-reduced-motion
 *
 * Usage:
 *   <Skeleton className="h-4 w-48" />         // text line
 *   <Skeleton className="h-10 w-full" />       // input / button
 *   <Skeleton className="h-32 w-full rounded-xl" />  // card
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-sked-pulse rounded-[12px] bg-foreground/10",
        className,
      )}
      {...props}
    />
  );
}
