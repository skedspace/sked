export type FaqItem = {
  question: string;
  answer: string;
};

export type PublicPageTheme = {
  id: string;
  label: string;
  description: string;
  colors: string[];
};

export const PUBLIC_PAGE_THEMES: PublicPageTheme[] = [
  {
    id: "default",
    label: "Modern Sport",
    description: "Crisp white surfaces with energetic lime actions.",
    colors: ["#72c914", "#07112b", "#f3f5ec", "#d9d9d6"],
  },
  {
    id: "warm",
    label: "Sunset Club",
    description: "Warm courtside tones for lifestyle-led venues.",
    colors: ["#f59e0b", "#3d2b1f", "#fff3df", "#e0d3c2"],
  },
  {
    id: "cool",
    label: "Coastal Play",
    description: "Fresh teal accents with clean booking cards.",
    colors: ["#14b8a6", "#103f4a", "#e8faf7", "#c8d7d5"],
  },
  {
    id: "dark",
    label: "Night Match",
    description: "High-contrast preview for evening and premium clubs.",
    colors: ["#eab308", "#1c1917", "#34302c", "#d6d3d1"],
  },
];

export function getPublicPageTheme(theme: string | null, primaryColor?: string | null) {
  const selected =
    PUBLIC_PAGE_THEMES.find((option) => option.id === theme) ??
    PUBLIC_PAGE_THEMES[0]!;
  const primary = primaryColor || selected.colors[0]!;

  return {
    ...selected,
    primary,
    ink: selected.colors[1]!,
    paper: selected.colors[2]!,
    muted: selected.colors[3]!,
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
