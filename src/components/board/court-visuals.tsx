"use client";

import { cn } from "@/lib/utils";

/* ── Accent palette ──
 * Each active court gets its own hue so the board reads at a glance from
 * across the room. Order matches the reference board: lime → azure → violet.
 */

export type CourtAccent = "lime" | "azure" | "violet" | "amber" | "rose";

export type AccentTheme = {
  /** Primary hex — text, badges, glows */
  hex: string;
  /** Deeper hex used for the far end of the court gradient */
  deep: string;
  /** Tailwind-ready rgb triplet for arbitrary alpha values */
  rgb: string;
};

export const COURT_ACCENTS: Record<CourtAccent, AccentTheme> = {
  lime: { hex: "#b9f34b", deep: "#2f5c16", rgb: "185 243 75" },
  azure: { hex: "#4a9eff", deep: "#123a70", rgb: "74 158 255" },
  violet: { hex: "#a97bf5", deep: "#3d1f6b", rgb: "169 123 245" },
  amber: { hex: "#f5b53c", deep: "#6b4310", rgb: "245 181 60" },
  rose: { hex: "#ff7a6b", deep: "#6b1f1a", rgb: "255 122 107" },
};

/** Cycle accents by index so any number of courts stays visually distinct. */
export const ACCENT_CYCLE: CourtAccent[] = ["lime", "azure", "violet", "amber", "rose"];

export function accentAt(index: number): CourtAccent {
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length] ?? "lime";
}

/** Inline CSS custom properties so children can use `rgb(var(--accent-rgb)/…)`. */
export function accentVars(accent: CourtAccent): React.CSSProperties {
  const theme = COURT_ACCENTS[accent];
  return {
    ["--accent" as string]: theme.hex,
    ["--accent-deep" as string]: theme.deep,
    ["--accent-rgb" as string]: theme.rgb,
  };
}

/* ── Mini court diagram ──
 * Top-down pickleball court drawn in perspective (near edge wider than far
 * edge) with a lit net down the middle, matching the board reference.
 */

interface MiniCourtProps {
  accent?: CourtAccent;
  /** Animate the net glow — used for live courts only. */
  live?: boolean;
  className?: string;
}

export function MiniCourt({
  accent = "lime",
  live = true,
  className,
}: MiniCourtProps) {
  const theme = COURT_ACCENTS[accent];
  const uid = `court-${accent}`;

  return (
    <svg
      viewBox="0 0 320 116"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`${uid}-surface`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.deep} stopOpacity="0.95" />
          <stop offset="55%" stopColor={theme.hex} stopOpacity="0.55" />
          <stop offset="100%" stopColor={theme.hex} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.55" r="0.6">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M46 10 L274 10 L316 108 L4 108 Z" />
        </clipPath>
      </defs>

      {/* Playing surface */}
      <path d="M46 10 L274 10 L316 108 L4 108 Z" fill={`url(#${uid}-surface)`} />
      <path d="M46 10 L274 10 L316 108 L4 108 Z" fill={`url(#${uid}-glow)`} />

      {/* Court markings */}
      <g
        clipPath={`url(#${uid}-clip)`}
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        fill="none"
      >
        {/* Inner sidelines */}
        <path d="M46 10 L274 10 L316 108 L4 108 Z" strokeOpacity="0.7" />
        {/* Non-volley zone (kitchen) lines flanking the net */}
        <path d="M128 10 L116 108" />
        <path d="M192 10 L204 108" />
        {/* Service centre line — stops at the kitchen on both sides */}
        <path d="M25 59 L122 59" />
        <path d="M198 59 L295 59" />
      </g>

      {/* Net */}
      <g>
        <line
          x1="160"
          y1="2"
          x2="160"
          y2="110"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="7"
          className={live ? "animate-sked-pulse" : undefined}
        />
        <line
          x1="160"
          y1="2"
          x2="160"
          y2="110"
          stroke="#ffffff"
          strokeOpacity="0.95"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
}

/* ── Pickleball paddle mark ──
 * Traced from public/images/pickleball.svg so it can inherit `currentColor`
 * instead of the flat black of the raw asset.
 */

export function PickleballIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      role="presentation"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      <path d="M261.58 50.55C274.16 38.01 292.27 31.38 309.97 32.55C325.31 33.38 340.16 40.14 350.94 51.06C385.46 85.52 419.93 120.04 454.43 154.53C458.91 159.06 463.65 163.40 467.34 168.63C477.76 182.93 481.62 201.74 477.86 219.01C475.38 230.93 469.31 242.03 460.69 250.63C423.86 287.49 386.99 324.32 350.16 361.18C345.95 365.29 341.97 369.64 337.50 373.46C320.53 388.01 295.71 392.06 274.85 384.22C252.61 376.81 230.38 369.40 208.14 362.00C176.93 393.21 145.70 424.40 114.54 455.66C116.15 464.88 110.42 474.41 101.83 477.82C94.44 480.99 85.30 479.10 79.74 473.29C65.89 459.44 52.02 445.59 38.19 431.72C32.57 426.13 30.82 417.13 33.92 409.84C37.35 401.26 46.91 395.96 56.02 397.28C87.30 366.12 118.48 334.86 149.73 303.66C142.48 281.74 135.15 259.85 127.86 237.94C120.35 218.64 122.74 195.77 134.76 178.81C138.21 173.69 142.69 169.42 147.04 165.08C185.23 126.91 223.39 88.72 261.58 50.55M295.34 49.60C286.19 51.66 277.85 56.64 271.37 63.36C232.03 102.74 192.67 142.10 153.31 181.45C143.29 191.38 138.17 205.96 139.83 219.97C140.42 226.01 142.67 231.68 144.54 237.40C151.45 258.17 158.40 278.93 165.28 299.71C165.83 301.87 167.72 303.22 169.18 304.76C182.53 318.06 195.85 331.40 209.16 344.75C210.99 346.63 213.79 346.87 216.14 347.80C238.12 355.14 260.12 362.47 282.11 369.78C295.24 374.17 310.25 372.40 321.96 365.00C327.88 361.42 332.45 356.13 337.35 351.35C374.84 313.85 412.37 276.41 449.81 238.86C462.02 226.60 466.52 207.42 460.98 191.02C458.48 183.08 453.62 176.08 447.65 170.36C411.65 134.36 375.69 98.33 339.64 62.38C328.37 50.86 311.02 45.87 295.34 49.60M70.18 405.80C82.09 417.72 94.01 429.64 105.93 441.55C135.52 411.99 165.09 382.42 194.65 352.84C182.73 340.92 170.85 328.96 158.89 317.08C129.33 346.66 99.74 376.22 70.18 405.80M51.29 413.30C48.25 414.48 47.37 418.89 50.04 420.96C63.54 434.49 77.07 448.00 90.58 461.52C91.87 463.00 94.05 463.89 95.92 462.94C98.70 461.80 99.82 457.68 97.34 455.65C83.70 441.93 69.99 428.27 56.31 414.59C55.08 413.21 53.04 412.42 51.29 413.30Z" />
      <path d="M398.16 336.26C413.78 334.16 430.08 337.36 443.69 345.35C457.44 353.30 468.41 365.94 474.33 380.68C479.63 393.68 480.94 408.25 478.10 422.00C474.79 438.53 465.40 453.74 452.13 464.14C439.18 474.44 422.54 479.97 406.00 479.56C392.39 479.29 378.90 475.02 367.59 467.43C354.87 458.98 345.00 446.34 339.86 431.96C333.92 415.56 334.22 397.00 340.79 380.84C350.03 357.07 372.85 339.37 398.16 336.26M396.46 352.75C379.55 356.07 364.57 367.73 357.17 383.28C350.14 397.67 349.76 415.09 356.18 429.76C362.07 443.64 373.88 454.83 388.01 460.06C400.45 464.75 414.57 464.73 427.02 460.07C440.21 455.25 451.36 445.20 457.62 432.63C464.07 419.87 465.34 404.59 461.03 390.95C457.02 377.96 448.08 366.57 436.40 359.62C424.55 352.46 410.01 349.95 396.46 352.75Z" />
      <path d="M380.21 368.17C390.22 365.17 401.29 373.61 401.17 384.01C401.66 393.64 392.57 402.22 382.98 401.13C373.66 400.60 366.15 391.19 367.80 381.97C368.68 375.43 373.79 369.73 380.21 368.17Z" />
      <path d="M426.31 368.24C435.28 365.47 445.57 371.79 447.21 381.01C449.39 390.14 442.41 399.99 433.10 401.02C424.34 402.53 415.35 395.78 414.20 387.00C412.77 378.85 418.29 370.29 426.31 368.24Z" />
      <path d="M380.38 414.52C389.51 411.96 399.67 418.71 400.95 428.06C402.74 437.32 395.30 446.94 385.89 447.51C377.20 448.53 368.65 441.62 367.75 432.94C366.52 424.75 372.31 416.33 380.38 414.52Z" />
      <path d="M426.40 414.62C435.96 411.66 446.76 419.12 447.49 429.07C448.73 438.54 440.51 447.77 430.95 447.58C421.61 447.94 413.31 439.27 414.03 429.97C414.28 422.89 419.54 416.37 426.40 414.62Z" />
    </svg>
  );
}

/* ── Dot-grid corner decoration (empty / ready court cards) ── */

export function DotGridCorner({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-0 right-0 h-32 w-40",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgb(255 255 255 / 0.16) 1.2px, transparent 1.2px)",
        backgroundSize: "10px 10px",
        maskImage:
          "radial-gradient(120px 90px at 100% 100%, black, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(120px 90px at 100% 100%, black, transparent 75%)",
      }}
    />
  );
}
