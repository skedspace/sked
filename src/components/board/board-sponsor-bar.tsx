"use client";

import { cn } from "@/lib/utils";
import { SponsorMarquee, type SponsorItem } from "./sponsor-marquee";

/* ── Props ── */

interface BoardSponsorBarProps {
  sponsors: SponsorItem[];
  /** Switch to the scrolling marquee past this many sponsors */
  marqueeThreshold?: number;
  className?: string;
}

/* ── SKED brand lockup ── */

function SkedLockup() {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {/* Pickleball mark */}
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="#b9f34b" />
        <g fill="#0f110e">
          <circle cx="13" cy="12" r="2.4" />
          <circle cx="22" cy="10" r="2.4" />
          <circle cx="29" cy="16" r="2.4" />
          <circle cx="11" cy="21" r="2.4" />
          <circle cx="20" cy="19" r="2.4" />
          <circle cx="28" cy="26" r="2.4" />
          <circle cx="15" cy="29" r="2.4" />
          <circle cx="23" cy="30" r="2.4" />
        </g>
      </svg>

      <span className="leading-none">
        <span className="block text-[22px] font-black tracking-tight text-white">
          SKED
        </span>
        <span className="block text-[9px] font-semibold uppercase tracking-[0.42em] text-white/45">
          Pickleball
        </span>
      </span>
    </div>
  );
}

/* ── Single sponsor slot ── */

function SponsorSlot({ sponsor }: { sponsor: SponsorItem }) {
  const inner = (
    <span className="flex items-center gap-2.5">
      {sponsor.icon && (
        <span className="text-xl leading-none" aria-hidden="true">
          {sponsor.icon}
        </span>
      )}
      {sponsor.type === "logo" && (
        <img
          src={sponsor.content}
          alt=""
          className="h-7 w-auto rounded object-contain"
          draggable={false}
        />
      )}
      <span className="leading-tight">
        {sponsor.label && (
          <span className="block text-[10px] font-medium text-white/40">
            {sponsor.label}
          </span>
        )}
        {sponsor.type === "text" && (
          <span className="block text-[15px] font-bold text-white/90">
            {sponsor.content}
          </span>
        )}
      </span>
    </span>
  );

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline transition-opacity hover:opacity-80"
      >
        {inner}
      </a>
    );
  }

  return inner;
}

/* ── Decorative wave ── */

function WaveDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] overflow-hidden md:block"
    >
      <svg
        viewBox="0 0 600 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="sked-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b9f34b" stopOpacity="0" />
            <stop offset="100%" stopColor="#b9f34b" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <path
          d="M0 78 C 140 78, 220 22, 380 22 S 540 62, 600 52"
          fill="none"
          stroke="url(#sked-wave)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M0 92 C 150 92, 230 40, 400 40 S 550 76, 600 68"
          fill="none"
          stroke="url(#sked-wave)"
          strokeWidth="3"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />
        <path
          d="M60 100 C 200 100, 260 56, 430 56 S 560 88, 600 84"
          fill="none"
          stroke="url(#sked-wave)"
          strokeWidth="1.5"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />
      </svg>

      {/* Ball resting on the wave */}
      <svg
        viewBox="0 0 40 40"
        className="absolute right-[10%] top-1/2 h-9 w-9 -translate-y-1/2"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="18" fill="#f2f7e6" />
        <g fill="#0f110e" opacity="0.75">
          <circle cx="13" cy="12" r="2.2" />
          <circle cx="22" cy="10" r="2.2" />
          <circle cx="29" cy="17" r="2.2" />
          <circle cx="12" cy="21" r="2.2" />
          <circle cx="21" cy="20" r="2.2" />
          <circle cx="28" cy="27" r="2.2" />
          <circle cx="15" cy="29" r="2.2" />
        </g>
      </svg>
    </div>
  );
}

/* ── Component ── */

export function BoardSponsorBar({
  sponsors,
  marqueeThreshold = 2,
  className,
}: BoardSponsorBarProps) {
  const useMarquee = sponsors.length > marqueeThreshold;

  return (
    <footer
      className={cn(
        "relative overflow-hidden border-t border-white/[0.08] bg-[#0b0d09]",
        className,
      )}
    >
      <div className="relative flex items-center gap-6 px-4 py-3 sm:px-6">
        {sponsors.length > 0 &&
          (useMarquee ? (
            <SponsorMarquee
              sponsors={sponsors}
              className="min-w-0 flex-1 border-0 bg-transparent"
            />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto md:gap-10">
              {sponsors.map((sponsor) => (
                <SponsorSlot key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          ))}
      </div>
    </footer>
  );
}
