export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * Storefront themes.
 *
 * A theme used to be four hex values, so every variation looked structurally
 * identical and only differed in colour. These tokens add the parts that
 * actually make two storefronts feel different — type, corner radius, section
 * treatment and hero composition — so a venue can pick a look rather than
 * just a palette.
 *
 * `colors` is retained in its original order ([primary, ink, paper, muted])
 * because the dashboard editor renders it directly as swatches and seeds the
 * colour picker from `colors[0]`.
 */

/** Corner rounding applied to cards, media and controls. */
export type ThemeRadius = "sharp" | "soft" | "round";

/** How section containers are separated from the page background. */
export type ThemeSurface = "flat" | "bordered" | "elevated";

/** Hero composition: booking panel beside the headline, or stacked under it. */
export type ThemeHero = "split" | "centered";

export type PublicPageTheme = {
  id: string;
  label: string;
  description: string;
  colors: string[];
  /** Whether `paper` is a dark surface — drives border and muted-text choices. */
  dark: boolean;
  headingFont: string;
  bodyFont: string;
  radius: ThemeRadius;
  surface: ThemeSurface;
  hero: ThemeHero;
};

// Concrete stacks only. These are assigned to a CSS custom property, and a
// custom property whose value contains an undefined var() computes to the
// empty string — which silently drops the theme's font instead of falling
// back. SANS mirrors the body stack in globals.css.
const SANS =
  'Inter, "Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif';
const SERIF = 'ui-serif, Georgia, "Times New Roman", Times, serif';
const MONO =
  'ui-monospace, "Cascadia Mono", "Segoe UI Mono", Consolas, monospace';

export const PUBLIC_PAGE_THEMES: PublicPageTheme[] = [
  {
    id: "default",
    label: "Modern Sport",
    description: "Crisp white surfaces with energetic lime actions.",
    colors: ["#72c914", "#07112b", "#f3f5ec", "#d9d9d6"],
    dark: false,
    headingFont: SANS,
    bodyFont: SANS,
    radius: "soft",
    surface: "bordered",
    hero: "split",
  },
  {
    id: "warm",
    label: "Sunset Club",
    description: "Warm courtside tones for lifestyle-led venues.",
    colors: ["#f59e0b", "#3d2b1f", "#fff3df", "#e0d3c2"],
    dark: false,
    headingFont: SERIF,
    bodyFont: SANS,
    radius: "round",
    surface: "elevated",
    hero: "split",
  },
  {
    id: "cool",
    label: "Coastal Play",
    description: "Fresh teal accents with clean booking cards.",
    colors: ["#14b8a6", "#103f4a", "#e8faf7", "#c8d7d5"],
    dark: false,
    headingFont: SANS,
    bodyFont: SANS,
    radius: "round",
    surface: "flat",
    hero: "centered",
  },
  {
    id: "dark",
    label: "Night Match",
    description: "High-contrast preview for evening and premium clubs.",
    // Was ["#eab308", "#1c1917", "#34302c", "#d6d3d1"] — ink (#1c1917) sat on
    // paper (#34302c) for a contrast ratio of 1.34:1, i.e. near-black text on
    // dark grey. On a dark theme the ink must be the light value. Pinned by the
    // WCAG AA check in public-page.test.ts.
    colors: ["#eab308", "#f5f5f4", "#1c1917", "#44403c"],
    dark: true,
    headingFont: SANS,
    bodyFont: SANS,
    radius: "soft",
    surface: "elevated",
    hero: "split",
  },
  {
    id: "editorial",
    label: "Court Editorial",
    description: "Serif headlines and generous space for premium clubs.",
    colors: ["#1f6feb", "#111827", "#ffffff", "#e5e7eb"],
    dark: false,
    headingFont: SERIF,
    bodyFont: SANS,
    radius: "sharp",
    surface: "flat",
    hero: "centered",
  },
  {
    id: "clay",
    label: "Clay Court",
    description: "Earthy terracotta with soft, rounded cards.",
    colors: ["#c2410c", "#2b1b14", "#faf1e8", "#e7d3c2"],
    dark: false,
    headingFont: SERIF,
    bodyFont: SANS,
    radius: "round",
    surface: "elevated",
    hero: "split",
  },
  {
    id: "midnight",
    label: "Midnight League",
    description: "Deep navy with mono accents for competitive leagues.",
    colors: ["#38bdf8", "#e2e8f0", "#0b1220", "#1e293b"],
    dark: true,
    headingFont: MONO,
    bodyFont: SANS,
    radius: "sharp",
    surface: "bordered",
    hero: "split",
  },
];

const RADIUS_SCALE: Record<ThemeRadius, { card: string; control: string }> = {
  sharp: { card: "0px", control: "0px" },
  soft: { card: "0.875rem", control: "0.625rem" },
  round: { card: "1.5rem", control: "9999px" },
};

/** Resolved tokens the storefront renders against. */
export type ResolvedPublicPageTheme = PublicPageTheme & {
  primary: string;
  ink: string;
  paper: string;
  muted: string;
  /** Hairline colour that works on both light and dark paper. */
  border: string;
  /** Slightly raised surface for cards sitting on `paper`. */
  card: string;
  cardRadius: string;
  controlRadius: string;
  /** Readable secondary text on `paper`. */
  subtleInk: string;
};

/** `#rrggbb` -> `rgba(r, g, b, alpha)`, so tokens can express translucency. */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int) || full.length !== 6) return hex;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPublicPageTheme(
  theme: string | null,
  primaryColor?: string | null,
): ResolvedPublicPageTheme {
  const selected =
    PUBLIC_PAGE_THEMES.find((option) => option.id === theme) ??
    PUBLIC_PAGE_THEMES[0]!;
  const primary = primaryColor || selected.colors[0]!;
  const ink = selected.colors[1]!;
  const paper = selected.colors[2]!;
  const muted = selected.colors[3]!;
  const radius = RADIUS_SCALE[selected.radius];

  return {
    ...selected,
    primary,
    ink,
    paper,
    muted,
    // On dark paper the ink is light, so tint borders and cards from the ink
    // side; on light paper tint from the ink to keep hairlines visible.
    border: selected.dark ? withAlpha(ink, 0.16) : withAlpha(ink, 0.12),
    card: selected.dark ? withAlpha(ink, 0.06) : "#ffffff",
    subtleInk: withAlpha(ink, 0.68),
    cardRadius: radius.card,
    controlRadius: radius.control,
  };
}

export type PublicPageSections = {
  storefront: {
    hero: {
      enabled: boolean;
      brandName: string;
      publicLabel: string;
      headline: string;
      subheadline: string;
      primaryCta: string;
      secondaryCta: string;
      coverUrl: string;
      logoUrl: string;
    };
    about: { enabled: boolean; title: string; body: string };
    amenities: { enabled: boolean; title: string; items: string[] };
    courts: { enabled: boolean; title: string; intro: string };
    gallery: { enabled: boolean; title: string; photos: string[] };
    promo: {
      enabled: boolean;
      eyebrow: string;
      title: string;
      body: string;
      ctaLabel: string;
    };
    testimonials: { enabled: boolean; title: string; quotes: string[] };
    faq: { enabled: boolean; title: string; items: FaqItem[] };
    contact: {
      enabled: boolean;
      address: string;
      city: string;
      hours: string;
      phone: string;
      email: string;
    };
  };
  booking: {
    service: { enabled: boolean; title: string; helper: string };
    dateTime: { enabled: boolean; title: string; helper: string };
    customer: { enabled: boolean; title: string; helper: string };
    payment: { enabled: boolean; title: string; helper: string };
    policy: { enabled: boolean; title: string; helper: string };
    confirmation: { enabled: boolean; title: string; helper: string };
  };
};

export const DEFAULT_PAGE_SECTIONS: PublicPageSections = {
  storefront: {
    hero: {
      enabled: true,
      brandName: "",
      publicLabel: "Public bookings",
      headline: "Play More. Wait Less.",
      subheadline:
        "Premium courts, easy booking, and more time for what matters.",
      primaryCta: "Book Your Court",
      secondaryCta: "View Courts",
      coverUrl: "",
      logoUrl: "",
    },
    about: {
      enabled: true,
      title: "Built for Great Games",
      body: "Well-maintained courts designed for players of all levels.",
    },
    amenities: {
      enabled: true,
      title: "Everything players need",
      items: [
        "Top quality courts",
        "Night play",
        "Free parking",
        "Amenities",
      ],
    },
    courts: {
      enabled: true,
      title: "Our Courts",
      intro: "Choose a court that fits your match, then reserve in seconds.",
    },
    gallery: {
      enabled: true,
      title: "Gallery",
      photos: [],
    },
    promo: {
      enabled: false,
      eyebrow: "New player offer",
      title: "Bring your crew and save on weekday play.",
      body: "Create a limited-time offer, league announcement, or membership push for your public page.",
      ctaLabel: "Claim offer",
    },
    testimonials: {
      enabled: true,
      title: "Loved by Players",
      quotes: [
        "Super easy to book and the courts are always in perfect condition!",
        "Love the vibes here. Great spot for weekend games with friends.",
        "Clean courts, great staff, and zero hassle booking. Highly recommend!",
      ],
    },
    faq: {
      enabled: false,
      title: "Questions before you book?",
      items: [
        {
          question: "Do I need to bring my own paddle?",
          answer: "Players can bring their own gear or ask the front desk about available rentals.",
        },
        {
          question: "Can I reschedule a booking?",
          answer: "Bookings can be moved when open slots are available and the venue policy allows it.",
        },
      ],
    },
    contact: {
      enabled: true,
      address: "123 Pickleball Lane",
      city: "Makati City, PH",
      hours: "Open Daily, 6:00 AM - 11:00 PM",
      phone: "+63 912 345 6789",
      email: "hello@acepickleball.ph",
    },
  },
  booking: {
    service: {
      enabled: true,
      title: "Book your court",
      helper: "Choose your court or coaching option.",
    },
    dateTime: {
      enabled: true,
      title: "Find available courts",
      helper: "Pick a date and reserve an open slot.",
    },
    customer: {
      enabled: true,
      title: "Your details",
      helper: "Collect customer name, email and phone before confirmation.",
    },
    payment: {
      enabled: true,
      title: "Secure your slot",
      helper: "Show price, deposit requirement and payment instructions.",
    },
    policy: {
      enabled: false,
      title: "Booking policy",
      helper: "Arrive 10 minutes early. Cancellations may be moved to store credit depending on venue policy.",
    },
    confirmation: {
      enabled: true,
      title: "Booking confirmed",
      helper: "Customers receive confirmation details instantly.",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : fallback;
}

function faqList(value: unknown, fallback: FaqItem[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter(isRecord)
    .map((item) => ({
      question: String(item.question ?? "").trim(),
      answer: String(item.answer ?? "").trim(),
    }))
    .filter((item) => item.question || item.answer);
  return items.length > 0 ? items : fallback;
}

export function readPublicPageSections(
  value: unknown,
  fallback?: {
    brandName?: string | null;
    bio?: string | null;
    coverUrl?: string | null;
    logoUrl?: string | null;
  },
): PublicPageSections {
  const raw = Array.isArray(value) ? value[0] : value;
  const saved = isRecord(raw) ? raw : {};
  const storefront = isRecord(saved.storefront) ? saved.storefront : {};
  const booking = isRecord(saved.booking) ? saved.booking : {};
  const hero = isRecord(storefront.hero) ? storefront.hero : {};
  const amenities = isRecord(storefront.amenities) ? storefront.amenities : {};
  const gallery = isRecord(storefront.gallery) ? storefront.gallery : {};
  const testimonials = isRecord(storefront.testimonials)
    ? storefront.testimonials
    : {};
  const faq = isRecord(storefront.faq) ? storefront.faq : {};

  return {
    storefront: {
      hero: {
        ...DEFAULT_PAGE_SECTIONS.storefront.hero,
        ...hero,
        brandName:
          String(hero.brandName ?? "") ||
          fallback?.brandName ||
          DEFAULT_PAGE_SECTIONS.storefront.hero.brandName,
        publicLabel:
          String(hero.publicLabel ?? "") ||
          DEFAULT_PAGE_SECTIONS.storefront.hero.publicLabel,
        subheadline:
          String(hero.subheadline ?? "") ||
          fallback?.bio ||
          DEFAULT_PAGE_SECTIONS.storefront.hero.subheadline,
        coverUrl: String(hero.coverUrl ?? "") || fallback?.coverUrl || "",
        logoUrl: String(hero.logoUrl ?? "") || fallback?.logoUrl || "",
      },
      about: {
        ...DEFAULT_PAGE_SECTIONS.storefront.about,
        ...(isRecord(storefront.about) ? storefront.about : {}),
      },
      amenities: {
        ...DEFAULT_PAGE_SECTIONS.storefront.amenities,
        ...amenities,
        items: stringList(
          amenities.items,
          DEFAULT_PAGE_SECTIONS.storefront.amenities.items,
        ),
      },
      courts: {
        ...DEFAULT_PAGE_SECTIONS.storefront.courts,
        ...(isRecord(storefront.courts) ? storefront.courts : {}),
      },
      gallery: {
        ...DEFAULT_PAGE_SECTIONS.storefront.gallery,
        ...gallery,
        photos: stringList(gallery.photos, DEFAULT_PAGE_SECTIONS.storefront.gallery.photos),
      },
      promo: {
        ...DEFAULT_PAGE_SECTIONS.storefront.promo,
        ...(isRecord(storefront.promo) ? storefront.promo : {}),
      },
      testimonials: {
        ...DEFAULT_PAGE_SECTIONS.storefront.testimonials,
        ...testimonials,
        quotes: stringList(
          testimonials.quotes,
          DEFAULT_PAGE_SECTIONS.storefront.testimonials.quotes,
        ),
      },
      faq: {
        ...DEFAULT_PAGE_SECTIONS.storefront.faq,
        ...faq,
        items: faqList(faq.items, DEFAULT_PAGE_SECTIONS.storefront.faq.items),
      },
      contact: {
        ...DEFAULT_PAGE_SECTIONS.storefront.contact,
        ...(isRecord(storefront.contact) ? storefront.contact : {}),
      },
    },
    booking: {
      service: {
        ...DEFAULT_PAGE_SECTIONS.booking.service,
        ...(isRecord(booking.service) ? booking.service : {}),
      },
      dateTime: {
        ...DEFAULT_PAGE_SECTIONS.booking.dateTime,
        ...(isRecord(booking.dateTime) ? booking.dateTime : {}),
      },
      customer: {
        ...DEFAULT_PAGE_SECTIONS.booking.customer,
        ...(isRecord(booking.customer) ? booking.customer : {}),
      },
      payment: {
        ...DEFAULT_PAGE_SECTIONS.booking.payment,
        ...(isRecord(booking.payment) ? booking.payment : {}),
      },
      policy: {
        ...DEFAULT_PAGE_SECTIONS.booking.policy,
        ...(isRecord(booking.policy) ? booking.policy : {}),
      },
      confirmation: {
        ...DEFAULT_PAGE_SECTIONS.booking.confirmation,
        ...(isRecord(booking.confirmation) ? booking.confirmation : {}),
      },
    },
  };
}
