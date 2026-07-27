"use client";

import { cn } from "@/lib/utils";

/* ── Types ── */

export type SponsorItem = {
  id: string;
  /** "text" for plain text, "logo" for an image URL */
  type: "text" | "logo";
  content: string;
  /** Optional link for click-through */
  url?: string;
  /** Kicker above the name, e.g. "Official Sponsor:" */
  label?: string;
  /** Optional emoji shown beside the name on the static sponsor bar */
  icon?: string;
};

/* ── Props ── */

interface SponsorMarqueeProps {
  sponsors: SponsorItem[];
  speed?: "slow" | "normal" | "fast";
  className?: string;
}

/* ── Speed map ── */

const SPEED_DURATION: Record<string, string> = {
  slow: "60s",
  normal: "40s",
  fast: "25s",
};

/* ── Component ── */

export function SponsorMarquee({
  sponsors,
  speed = "normal",
  className,
}: SponsorMarqueeProps) {
  if (!sponsors || sponsors.length === 0) return null;

  const duration = SPEED_DURATION[speed];

  // Duplicate items so the marquee feels seamless when it resets
  const items = [...sponsors, ...sponsors];

  return (
    <div
      className={cn(
        "group/marquee relative flex h-10 w-full items-center overflow-hidden border-t border-white/10 bg-[#0f110e]",
        className,
      )}
    >
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0f110e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0f110e] to-transparent" />

      {/* Scrolling track — pauses on hover */}
      <div
        className="flex animate-marquee items-center gap-12 whitespace-nowrap will-change-transform group-hover/marquee:[animation-play-state:paused]"
        style={{ animationDuration: duration }}
      >
        {items.map((sponsor, idx) => (
          <SponsorBadge key={`${sponsor.id}-${idx}`} sponsor={sponsor} />
        ))}
      </div>
    </div>
  );
}

/* ── Single badge ── */

function SponsorBadge({ sponsor }: { sponsor: SponsorItem }) {
  const inner = (
    <span className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors duration-300 hover:text-white/80">
      {sponsor.type === "logo" ? (
        <img
          src={sponsor.content}
          alt=""
          className="inline-block h-6 w-auto rounded object-contain brightness-0 invert"
          draggable={false}
        />
      ) : (
        <span className="tracking-wide">{sponsor.content}</span>
      )}
    </span>
  );

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
      >
        {inner}
      </a>
    );
  }

  return inner;
}
