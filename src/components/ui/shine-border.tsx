"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShineBorderColor = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: ShineBorderColor;
  className?: string;
  children: ReactNode;
}

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
}: ShineBorderProps) {
  const colors = Array.isArray(color) ? color : [color];
  const colorFrom = colors[0] ?? "#000000";
  const colorTo = colors[1] ?? colorFrom;

  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as CSSProperties
      }
      className={cn(
        "relative overflow-hidden rounded-[var(--border-radius)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--shine-color-from": colorFrom,
            "--shine-color-to": colorTo,
            "--mask-linear-gradient":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          } as CSSProperties
        }
        className="pointer-events-none absolute inset-0 rounded-[inherit] before:absolute before:inset-0 before:size-full before:rounded-[inherit] before:[background-image:conic-gradient(from_var(--shine-angle),color-mix(in_srgb,var(--shine-color-from)_18%,transparent)_0deg,color-mix(in_srgb,var(--shine-color-from)_18%,transparent)_250deg,var(--shine-color-from)_292deg,var(--shine-color-to)_322deg,color-mix(in_srgb,var(--shine-color-from)_18%,transparent)_360deg)] before:![mask-composite:exclude] before:p-[var(--border-width)] before:content-[''] before:![-webkit-mask-composite:xor] before:[--shine-angle:0deg] before:[mask:var(--mask-linear-gradient)] motion-safe:before:animate-[shine-orbit_var(--shine-pulse-duration)_infinite_linear]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
