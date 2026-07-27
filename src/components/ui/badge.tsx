import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default:
      "border-transparent bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:brightness-[1.04]",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
    outline: "text-foreground",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none",
        variants[variant] ?? variants.default,
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
