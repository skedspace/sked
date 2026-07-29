import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}: BorderBeamProps) => {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        "after:absolute after:inset-0 after:rounded-[inherit] after:p-[calc(var(--border-width)*1px)] after:content-['']",
        "after:[background-image:conic-gradient(from_var(--shine-angle),color-mix(in_srgb,var(--color-from)_18%,transparent)_0deg,color-mix(in_srgb,var(--color-from)_18%,transparent)_250deg,var(--color-from)_292deg,var(--color-to)_322deg,color-mix(in_srgb,var(--color-from)_18%,transparent)_360deg)] after:[--shine-angle:0deg] after:[animation-delay:var(--delay)]",
        "after:![mask-composite:exclude] after:![-webkit-mask-composite:xor] after:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] after:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] motion-safe:after:animate-[shine-orbit_calc(var(--duration)*1s)_infinite_linear]",
        className,
      )}
    />
  );
};
