import type { Metadata } from "next";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Facebook,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicPageContent } from "./public-page-content";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; service?: string; preview?: string }>;
};

type PublicSections = {
  storefront: {
    hero: {
      enabled: boolean;
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
    testimonials: { enabled: boolean; title: string; quotes: string[] };
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
    confirmation: { enabled: boolean; title: string; helper: string };
  };
};

const DEFAULT_SECTIONS: PublicSections = {
  storefront: {
    hero: {
      enabled: true,
      headline: "Play More. Wait Less.",
      subheadline: "Premium courts, easy booking, and more time for what matters.",
      primaryCta: "Book your court",
      secondaryCta: "View courts",
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
      items: ["Top quality courts", "Night play", "Free parking", "Amenities"],
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
    testimonials: {
      enabled: true,
      title: "Loved by Players",
      quotes: [
        "Super easy to book and the courts are always in perfect condition!",
        "Love the vibes here. Great spot for weekend games with friends.",
        "Clean courts, great staff, and zero hassle booking. Highly recommend!",
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
      helper: "Enter your name, email and phone.",
    },
    payment: {
      enabled: true,
      title: "Secure your slot",
      helper: "Review the price and apply any discount codes.",
    },
    confirmation: {
      enabled: true,
      title: "Booking confirmed",
      helper: "You'll receive a confirmation email shortly.",
    },
  },
};

const FALLBACK_HERO = "/images/newbg.webp";
const FALLBACK_GALLERY = [
  "/images/cta.webp",
  "/images/cta2.webp",
  "/images/cta3.webp",
];

const HERO_FEATURES: Array<{ label: string; Icon: LucideIcon }> = [
  { label: "Easy booking", Icon: CalendarDays },
  { label: "Premium courts", Icon: ShieldCheck },
  { label: "Play your way", Icon: UsersRound },
];

const BOOKING_STEPS: Array<{
  title: string;
  body: string;
  Icon: LucideIcon;
}> = [
  {
    title: "Choose Date & Time",
    body: "Pick the date and time that works for you.",
    Icon: CalendarDays,
  },
  {
    title: "Select Players",
    body: "Add your players and game details.",
    Icon: UsersRound,
  },
  {
    title: "Confirm & Play",
    body: "Secure your booking and get ready to play.",
    Icon: CheckCircle2,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : fallback;
}

function readSections(value: unknown): PublicSections {
  const raw = Array.isArray(value) ? value[0] : value;
  const saved = isRecord(raw) ? raw : {};
  const storefront = isRecord(saved.storefront) ? saved.storefront : {};
  const booking = isRecord(saved.booking) ? saved.booking : {};
  const amenities = isRecord(storefront.amenities) ? storefront.amenities : {};
  const gallery = isRecord(storefront.gallery) ? storefront.gallery : {};
  const testimonials = isRecord(storefront.testimonials)
    ? storefront.testimonials
    : {};

  return {
    storefront: {
      hero: {
        ...DEFAULT_SECTIONS.storefront.hero,
        ...(isRecord(storefront.hero) ? storefront.hero : {}),
      },
      about: {
        ...DEFAULT_SECTIONS.storefront.about,
        ...(isRecord(storefront.about) ? storefront.about : {}),
      },
      amenities: {
        ...DEFAULT_SECTIONS.storefront.amenities,
        ...amenities,
        items: stringList(
          amenities.items,
          DEFAULT_SECTIONS.storefront.amenities.items,
        ),
      },
      courts: {
        ...DEFAULT_SECTIONS.storefront.courts,
        ...(isRecord(storefront.courts) ? storefront.courts : {}),
      },
      gallery: {
        ...DEFAULT_SECTIONS.storefront.gallery,
        ...gallery,
        photos: stringList(gallery.photos, DEFAULT_SECTIONS.storefront.gallery.photos),
      },
      testimonials: {
        ...DEFAULT_SECTIONS.storefront.testimonials,
        ...testimonials,
        quotes: stringList(
          testimonials.quotes,
          DEFAULT_SECTIONS.storefront.testimonials.quotes,
        ),
      },
      contact: {
        ...DEFAULT_SECTIONS.storefront.contact,
        ...(isRecord(storefront.contact) ? storefront.contact : {}),
      },
    },
    booking: {
      service: {
        ...DEFAULT_SECTIONS.booking.service,
        ...(isRecord(booking.service) ? booking.service : {}),
      },
      dateTime: {
        ...DEFAULT_SECTIONS.booking.dateTime,
        ...(isRecord(booking.dateTime) ? booking.dateTime : {}),
      },
      customer: {
        ...DEFAULT_SECTIONS.booking.customer,
        ...(isRecord(booking.customer) ? booking.customer : {}),
      },
      payment: {
        ...DEFAULT_SECTIONS.booking.payment,
        ...(isRecord(booking.payment) ? booking.payment : {}),
      },
      confirmation: {
        ...DEFAULT_SECTIONS.booking.confirmation,
        ...(isRecord(booking.confirmation) ? booking.confirmation : {}),
      },
    },
  };
}

function splitHeadline(headline: string) {
  const parts = headline.split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { lead: headline, accent: "" };
  return { lead: `${parts[0]}.`, accent: `${parts.slice(1).join(". ")}.` };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createClient();
  const { data } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();
  if (!data) return { title: "Not found | SKED" };
  return {
    title: `${data.org_name} | SKED`,
    description: data.bio ?? "Book your slot online",
    openGraph: {
      title: data.org_name,
      description: data.bio ?? "Book your slot online",
    },
  };
}

export default async function PublicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { date, service, preview } = await searchParams;
  const isPreview = preview === "1";
  const supabase = createClient();
  const { data: pageData } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();

  if (!pageData || (!pageData.is_published && !isPreview)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f4] p-8 text-center">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#071420] text-[#b9f34b] shadow-lg">
          <CalendarDays className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <h1 className="mb-3 text-3xl font-black tracking-[-0.04em] text-[#071420]">
          Not available
        </h1>
        <p className="max-w-sm text-sm leading-7 text-[#626860]">
          This business isn&apos;t currently accepting online bookings. Check
          back later or contact them directly.
        </p>
      </main>
    );
  }

  const sections = readSections(pageData.sections);
  const hero = sections.storefront.hero;
  const about = sections.storefront.about;
  const amenities = sections.storefront.amenities;
  const courts = sections.storefront.courts;
  const gallery = sections.storefront.gallery;
  const testimonials = sections.storefront.testimonials;
  const contact = sections.storefront.contact;
  const socials = (pageData.socials ?? {}) as Record<string, string>;
  const coverUrl = hero.coverUrl || pageData.cover_url || FALLBACK_HERO;
  const logoUrl = hero.logoUrl || pageData.logo_url;
  const headline = splitHeadline(hero.headline);
  const galleryPhotos = gallery.photos.length > 0 ? gallery.photos : FALLBACK_GALLERY;
  const displayName = pageData.org_name || "Ace Pickleball";
  const bookingCopy = {
    serviceTitle: sections.booking.service.enabled
      ? sections.booking.service.title
      : undefined,
    serviceHelper: sections.booking.service.enabled
      ? sections.booking.service.helper
      : undefined,
    dateTimeTitle: sections.booking.dateTime.enabled
      ? sections.booking.dateTime.title
      : undefined,
    dateTimeHelper: sections.booking.dateTime.enabled
      ? sections.booking.dateTime.helper
      : undefined,
    customerTitle: sections.booking.customer.enabled
      ? sections.booking.customer.title
      : undefined,
    customerHelper: sections.booking.customer.enabled
      ? sections.booking.customer.helper
      : undefined,
    paymentTitle: sections.booking.payment.enabled
      ? sections.booking.payment.title
      : undefined,
    paymentHelper: sections.booking.payment.enabled
      ? sections.booking.payment.helper
      : undefined,
    confirmationTitle: sections.booking.confirmation.enabled
      ? sections.booking.confirmation.title
      : undefined,
    confirmationHelper: sections.booking.confirmation.enabled
      ? sections.booking.confirmation.helper
      : undefined,
  };
  const socialLinks = [
    { href: socials.facebook, label: "Facebook", Icon: Facebook },
    { href: socials.instagram, label: "Instagram", Icon: Instagram },
    { href: socials.website, label: "Website", Icon: Globe2 },
  ].filter((item) => item.href);
  const amenityIcons = [Trophy, Moon, Car, Sparkles];
  const contactItems = [
    [contact.address, contact.city].filter(Boolean).join(", "),
    contact.hours,
    [contact.phone, contact.email].filter(Boolean).join(" / "),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f8f9f5] text-[#071420]">
      <section className="relative isolate overflow-hidden bg-[#071420] text-white">
        {hero.enabled && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,10,17,0.94),rgba(2,10,17,0.72)_45%,rgba(2,10,17,0.46))]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-8 sm:px-8 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center lg:py-12">
          <div className="max-w-2xl">
            <div className="mb-20 flex items-center gap-3 lg:mb-28">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-14 w-14 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#b9f34b] text-base font-black text-[#071420]">
                  {initials(displayName) || "P"}
                </span>
              )}
              <div>
                <p className="text-2xl font-black uppercase tracking-[0.12em]">
                  {displayName}
                </p>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-[#b9f34b]">
                  Public bookings
                </p>
              </div>
            </div>

            {hero.enabled && (
              <>
                <h1 className="max-w-2xl text-5xl font-black uppercase leading-[0.95] tracking-normal sm:text-7xl">
                  {headline.lead}
                  {headline.accent && (
                    <span className="block text-[#b9f34b]">{headline.accent}</span>
                  )}
                </h1>
                <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-white/86">
                  {hero.subheadline || pageData.bio}
                </p>
              </>
            )}

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {HERO_FEATURES.map(({ label, Icon }) => (
                <div key={label} className="min-w-0">
                  <Icon className="mb-4 h-9 w-9 text-[#b9f34b]" strokeWidth={1.6} />
                  <p className="text-xs font-black uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="booking"
            className="w-full max-w-[560px] justify-self-center lg:justify-self-end"
          >
            <PublicPageContent
              slug={slug}
              orgId={pageData.org_id}
              services={pageData.services ?? []}
              initialDate={date ?? null}
              initialService={service ?? null}
              isPreview={isPreview}
              primaryColor={pageData.primary_color ?? undefined}
              inkColor={undefined}
              mutedColor={undefined}
              bookingCopy={bookingCopy}
              tone="dark"
            />
          </aside>
        </div>
      </section>

      {amenities.enabled && amenities.items.length > 0 && (
        <section className="border-b border-[#e7e9e2] bg-white">
          <div className="mx-auto grid max-w-7xl gap-0 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {amenities.items.slice(0, 4).map((item, index) => {
              const Icon = amenityIcons[index % amenityIcons.length]!;
              return (
                <div
                  key={`${item}-${index}`}
                  className="border-[#e7e9e2] py-6 text-center sm:px-8 lg:border-r lg:last:border-r-0"
                >
                  <Icon className="mx-auto mb-5 h-10 w-10 text-[#8bd11c]" strokeWidth={1.55} />
                  <h2 className="text-sm font-black uppercase">{item}</h2>
                  <p className="mx-auto mt-3 max-w-44 text-sm leading-6 text-[#5f695c]">
                    {index === 0
                      ? "Consistent bounce built for performance."
                      : index === 1
                        ? "Bright lights for more play, any time."
                        : index === 2
                          ? "Easy and convenient on-site parking."
                          : "Water, restrooms, and player comforts."}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {about.enabled && (
        <section className="border-b border-[#e7e9e2] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8bd11c]">About</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-normal">
                {about.title}
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#5f695c]">
                {about.body}
              </p>
            </div>
          </div>
        </section>
      )}

      {courts.enabled && (
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8bd11c]">
              {courts.title}
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-normal">
              {about.enabled ? about.title : "Built for Great Games"}
            </h2>
            <p className="mt-5 text-base leading-7 text-[#5f695c]">
              {courts.intro || about.body}
            </p>
            <a
              href="#booking"
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#071420] px-6 text-sm font-black uppercase text-white shadow-[0_12px_24px_rgba(7,20,32,0.18)] transition-colors hover:bg-[#14293a]"
            >
              {hero.secondaryCta || "View courts"}
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#b9f34b] text-[#071420]">
                <ChevronRight className="h-4 w-4" />
              </span>
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {galleryPhotos.slice(0, 3).map((photo, index) => (
              <article
                key={`${photo}-${index}`}
                className="group relative min-h-80 overflow-hidden rounded-xl bg-[#071420] shadow-[0_18px_36px_rgba(7,20,32,0.16)]"
              >
                <img
                  src={photo}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#03101b] via-[#03101b]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-semibold uppercase text-white/70">
                    Court {index + 1}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black uppercase">
                      Court {index + 1}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className="h-2 w-2 rounded-full bg-[#b9f34b]" />
                      Available
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid overflow-hidden rounded-2xl bg-[#071420] text-white lg:grid-cols-[1fr_340px]">
          <div className="p-8 md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b9f34b]">
              Book in
            </p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-normal">
              3 simple steps
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {BOOKING_STEPS.map(({ title, body, Icon }, index) => {
                const stepTitle =
                  index === 0
                    ? sections.booking.service.title
                    : index === 1
                      ? sections.booking.dateTime.title
                      : sections.booking.confirmation.title;
                return (
                  <div key={title}>
                    <Icon className="mb-6 h-11 w-11 text-[#b9f34b]" strokeWidth={1.55} />
                    <p className="text-sm font-black">
                      {index + 1}. {stepTitle || title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      {body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative min-h-72">
            <img
              src="/images/newbg.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071420] via-[#071420]/40 to-transparent lg:bg-gradient-to-l" />
          </div>
        </div>
      </section>

      {gallery.enabled && gallery.photos.length > 0 && (
        <section className="border-b border-[#e7e9e2] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8bd11c]">Gallery</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-normal">
                {gallery.title}
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.photos.slice(0, 6).map((photo, index) => (
                <div key={`${photo}-${index}`} className="group relative min-h-64 overflow-hidden rounded-xl bg-[#071420]">
                  <img
                    src={photo}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials.enabled && testimonials.quotes.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-16 text-center sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8bd11c]">
            What players are saying
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal">
            {testimonials.title}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.quotes.slice(0, 3).map((quote, index) => (
              <article
                key={`${quote}-${index}`}
                className="rounded-xl bg-white p-8 text-left shadow-[0_14px_40px_rgba(7,20,32,0.08)]"
              >
                <div className="mb-5 flex gap-1 text-[#8bd11c]">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-base leading-7 text-[#273220]">&quot;{quote}&quot;</p>
                <p className="mt-6 text-sm font-black">
                  - Player {index + 1}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <div className="grid items-center gap-6 overflow-hidden rounded-2xl bg-[#071420] p-6 text-white md:grid-cols-[220px_1fr_auto] md:p-8">
          <img
            src="/images/newbg.webp"
            alt=""
            className="h-32 w-full rounded-xl object-cover md:h-24"
          />
          <div>
            <h2 className="text-2xl font-black uppercase">Ready to play?</h2>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Book your court now and get out on the court.
            </p>
          </div>
          <a
            href="#booking"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#b9f34b] px-8 text-sm font-black uppercase text-[#071420] transition-colors hover:bg-[#a8ea2d]"
          >
            {hero.primaryCta || "Book your court"}
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {(contact.enabled || socialLinks.length > 0 || pageData.plan === "free") && (
        <footer className="border-t border-[#e7e9e2] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#5f695c] sm:px-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="font-black text-[#071420]">{displayName}</p>
              {contact.enabled && contactItems.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {contactItems.map((item, index) => {
                    const Icon = index === 0 ? MapPin : index === 1 ? Clock3 : Mail;
                    return (
                      <span key={item} className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#8bd11c]" />
                        {item}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e0e5da] px-4 font-bold text-[#071420] hover:bg-[#f8f9f5]"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
              {pageData.plan === "free" && (
                <a
                  href="https://sked.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#071420] hover:underline"
                >
                  Powered by SKED
                </a>
              )}
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}
