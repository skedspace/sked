import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
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
  Trophy,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicPageContent } from "./public-page-content";
import { createClient } from "@/lib/supabase/server";
import { getPublicPageTheme, readPublicPageSections } from "@/lib/public-page";
import { getContrastText } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    service?: string;
    preview?: string;
    theme?: string;
  }>;
};

const FALLBACK_HERO = "/images/newbg.webp";

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
  // The root layout applies a `%s | SKED` template, so these titles must not
  // append the suffix themselves — that produced "Venue | SKED | SKED".
  if (!data) return { title: "Not found" };
  const sections = readPublicPageSections(data.sections, {
    brandName: data.org_name,
    bio: data.bio,
    coverUrl: data.cover_url,
    logoUrl: data.logo_url,
  });
  const displayName = sections.storefront.hero.brandName || data.org_name;
  return {
    title: displayName,
    description: data.bio ?? "Book your slot online",
    openGraph: {
      title: displayName,
      description: data.bio ?? "Book your slot online",
    },
  };
}

export default async function PublicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { date, service, preview, theme: themeParam } = await searchParams;
  const isPreview = preview === "1";
  const supabase = createClient();
  const { data: pageData } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();

  if (!pageData || (!pageData.is_published && !isPreview)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f4] p-8 text-center">
        {/* Outside the themed <main>, so no --sked-* variables exist here. */}
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

  const sections = readPublicPageSections(pageData.sections, {
    brandName: pageData.org_name,
    bio: pageData.bio,
    coverUrl: pageData.cover_url,
    logoUrl: pageData.logo_url,
  });
  const hero = sections.storefront.hero;
  const about = sections.storefront.about;
  const amenities = sections.storefront.amenities;
  const courts = sections.storefront.courts;
  const gallery = sections.storefront.gallery;
  const promo = sections.storefront.promo;
  const testimonials = sections.storefront.testimonials;
  const faq = sections.storefront.faq;
  const contact = sections.storefront.contact;
  const socials = (pageData.socials ?? {}) as Record<string, string>;
  const coverUrl = hero.coverUrl || pageData.cover_url || FALLBACK_HERO;
  const logoUrl = hero.logoUrl || pageData.logo_url;
  const headline = splitHeadline(hero.headline);
  // No stock fallback: these render as the venue's own courts, so borrowed
  // images read as a claim. Both consumers hide themselves when it is empty.
  const galleryPhotos = gallery.photos;
  const displayName = hero.brandName || pageData.org_name || "Ace Pickleball";
  const publicLabel = hero.publicLabel || "Public bookings";
  // `?theme=` is honoured only alongside `?preview=1`, so the dashboard can
  // show a live theme preview without letting anyone restyle a venue's live
  // page from a URL. Unknown ids fall back to the default inside the resolver.
  const previewTheme = isPreview && themeParam ? themeParam : null;
  const pageTheme = getPublicPageTheme(
    previewTheme || pageData.theme || "default",
    // When previewing a specific theme, show that theme's own accent — the
    // saved primary_color belongs to whichever theme is currently applied and
    // would otherwise mask the difference between variations.
    previewTheme ? null : pageData.primary_color,
  );
  const primaryTextColor = getContrastText(pageTheme.primary);

  // ── Theme-driven layout ──
  // `hero` decides whether the booking panel sits beside the headline or under
  // it; `surface` decides how section bands separate from the page background.
  const heroCentered = pageTheme.hero === "centered";
  const heroGridClass = heroCentered
    ? "mx-auto flex max-w-4xl flex-col items-center gap-12 px-5 pb-14 pt-8 text-center sm:px-8 lg:py-16"
    : "mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-8 sm:px-8 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center lg:py-12";
  const heroCopyClass = heroCentered
    ? "flex w-full flex-col items-center"
    : "max-w-2xl";
  // A left-to-right scrim only reads correctly when the copy is left-aligned.
  const heroScrimClass = heroCentered
    ? "absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,10,17,0.86),rgba(2,10,17,0.62)_45%,rgba(2,10,17,0.9))]"
    : "absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,10,17,0.94),rgba(2,10,17,0.72)_45%,rgba(2,10,17,0.46))]";

  const bandStyle: CSSProperties =
    pageTheme.surface === "flat"
      ? { backgroundColor: "transparent" }
      : pageTheme.surface === "elevated"
        ? {
            backgroundColor: pageTheme.card,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
          }
        : { backgroundColor: pageTheme.card };
  // Flat themes drop the hairlines entirely so bands melt into the page.
  const bandBorder = pageTheme.surface === "flat" ? "border-transparent" : "border-[var(--sked-border)]";
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
    policyTitle: sections.booking.policy.enabled
      ? sections.booking.policy.title
      : undefined,
    policyHelper: sections.booking.policy.enabled
      ? sections.booking.policy.helper
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
  // Each entry carries its own icon. Pairing by array index broke as soon as
  // an earlier field was blank — an empty address handed the map pin to the
  // opening hours.
  const contactItems = [
    { text: [contact.address, contact.city].filter(Boolean).join(", "), Icon: MapPin },
    { text: contact.hours, Icon: Clock3 },
    { text: [contact.phone, contact.email].filter(Boolean).join(" / "), Icon: Mail },
  ].filter((item) => item.text);
  const { data: orgSettings } = await supabase
    .from("org_settings")
    .select("payment_methods")
    .eq("org_id", pageData.org_id)
    .maybeSingle();
  const paymentMethods = Array.isArray(orgSettings?.payment_methods)
    ? orgSettings.payment_methods
    : [];

  return (
    <main
      className="min-h-screen"
      style={
        {
          backgroundColor: pageTheme.paper,
          color: pageTheme.ink,
          fontFamily: pageTheme.bodyFont,
          // Consumed by the section styles below and by nested client
          // components, so a theme change restyles the whole storefront
          // without threading props through every child.
          "--sked-primary": pageTheme.primary,
          "--sked-ink": pageTheme.ink,
          "--sked-paper": pageTheme.paper,
          "--sked-muted": pageTheme.muted,
          "--sked-border": pageTheme.border,
          "--sked-card": pageTheme.card,
          "--sked-subtle-ink": pageTheme.subtleInk,
          "--sked-card-radius": pageTheme.cardRadius,
          "--sked-control-radius": pageTheme.controlRadius,
          "--sked-heading-font": pageTheme.headingFont,
        } as CSSProperties
      }
    >
      <section
        className="relative isolate overflow-hidden text-white"
        style={{ backgroundColor: pageTheme.ink }}
      >
        {hero.enabled && (
          // The hero cover is the LCP element on this page, so it is marked
          // priority to skip lazy-loading and preloaded at full viewport width.
          <Image
            src={coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
        )}
        <div className={heroScrimClass} />
        <div className={heroGridClass}>
          <div className={heroCopyClass}>
            <div
              className={`flex items-center gap-3 ${
                heroCentered ? "mb-10 justify-center" : "mb-20 lg:mb-28"
              }`}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${displayName} logo`}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <span
                  className="grid h-14 w-14 place-items-center rounded-full text-base font-black"
                  style={{
                    backgroundColor: pageTheme.primary,
                    color: primaryTextColor,
                  }}
                >
                  {initials(displayName) || "P"}
                </span>
              )}
              <div>
                <p className="text-2xl font-black uppercase tracking-[0.12em]">
                  {displayName}
                </p>
                <p
                  className="text-xs font-black uppercase tracking-[0.26em]"
                  style={{ color: pageTheme.primary }}
                >
                  {publicLabel}
                </p>
              </div>
            </div>

            {hero.enabled && (
              <>
                <h1
                  className="max-w-2xl text-5xl font-black uppercase leading-[0.95] tracking-normal sm:text-7xl"
                  style={{ fontFamily: "var(--sked-heading-font)" }}
                >
                  {headline.lead}
                  {headline.accent && (
                    <span className="block" style={{ color: pageTheme.primary }}>{headline.accent}</span>
                  )}
                </h1>
                <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-white/86">
                  {hero.subheadline || pageData.bio}
                </p>
              </>
            )}

            <div
              className={`mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 ${
                heroCentered ? "w-full max-w-xl" : ""
              }`}
            >
              {HERO_FEATURES.map(({ label, Icon }) => (
                <div key={label} className="min-w-0">
                  <Icon className="mb-4 h-9 w-9" strokeWidth={1.6} style={{ color: pageTheme.primary }} />
                  <p className="text-xs font-black uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="booking"
            className={
              heroCentered
                ? "w-full max-w-[560px] text-left"
                : "w-full max-w-[560px] justify-self-center lg:justify-self-end"
            }
          >
            <PublicPageContent
              slug={slug}
              orgId={pageData.org_id}
              services={pageData.services ?? []}
              initialDate={date ?? null}
              initialService={service ?? null}
              isPreview={isPreview}
              primaryColor={pageTheme.primary}
              inkColor={pageTheme.ink}
              mutedColor={pageTheme.muted}
              bookingCopy={bookingCopy}
              paymentMethods={paymentMethods}
              tone="dark"
            />
          </aside>
        </div>
      </section>

      {amenities.enabled && amenities.items.length > 0 && (
        <section className={`border-b ${bandBorder}`} style={bandStyle}>
          <div className="mx-auto grid max-w-7xl gap-0 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {amenities.items.slice(0, 4).map((item, index) => {
              const Icon = amenityIcons[index % amenityIcons.length]!;
              return (
                <div
                  key={`${item}-${index}`}
                  className="border-[var(--sked-border)] py-6 text-center sm:px-8 lg:border-r lg:last:border-r-0"
                >
                  {/*
                    The blurb here used to be chosen by array position, so an
                    owner who typed their own amenities got someone else's
                    description under it — "Pro shop" captioned "Easy and
                    convenient on-site parking." The label is the only text the
                    owner actually authored, so it is the only text shown.
                  */}
                  <Icon className="mx-auto mb-5 h-10 w-10" strokeWidth={1.55} style={{ color: pageTheme.primary }} />
                  <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="text-sm font-black uppercase">{item}</h2>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {about.enabled && (
        <section className={`border-b ${bandBorder}`} style={bandStyle}>
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>About</p>
              <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-4 text-4xl font-black leading-tight tracking-normal">
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
        <section
          className={`mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:items-center ${
            galleryPhotos.length > 0 ? "lg:grid-cols-[280px_minmax(0,1fr)]" : ""
          }`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>
              Courts
            </p>
            <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-5 text-4xl font-black leading-tight tracking-normal">
              {courts.title}
            </h2>
            <p className="mt-5 text-base leading-7 text-[#5f695c]">
              {courts.intro || "Choose a court that fits your match, then reserve in seconds."}
            </p>
            <a
              href="#booking"
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-[var(--sked-control-radius)] bg-[#071420] px-6 text-sm font-black uppercase text-white shadow-[0_12px_24px_rgba(7,20,32,0.18)] transition-colors hover:bg-[#14293a]"
              style={{ backgroundColor: pageTheme.ink, color: "#ffffff" }}
            >
              {hero.secondaryCta || "View courts"}
              <span
                className="grid h-5 w-5 place-items-center rounded-full"
                style={{ backgroundColor: pageTheme.primary, color: primaryTextColor }}
              >
                <ChevronRight className="h-4 w-4" />
              </span>
            </a>
          </div>

          {/*
            These are the owner's gallery photos, not resource records. They
            previously carried a "Court N" byline and a hardcoded "Available"
            badge, which named arbitrary photos as specific courts and claimed
            a booking status nothing had checked. Showing the photos plainly is
            the honest version until resources are exposed publicly.
          */}
          {galleryPhotos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {galleryPhotos.slice(0, 3).map((photo, index) => (
                <article
                  key={`${photo}-${index}`}
                  className="group relative min-h-80 overflow-hidden rounded-[var(--sked-control-radius)] bg-[#071420] shadow-[0_18px_36px_rgba(7,20,32,0.16)]"
                  style={{ backgroundColor: pageTheme.ink }}
                >
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03101b] via-[#03101b]/20 to-transparent" />
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {promo.enabled && (
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div
            className="grid items-center gap-6 overflow-hidden rounded-[var(--sked-card-radius)] p-6 text-white md:grid-cols-[1fr_auto] md:p-8"
            style={{ backgroundColor: pageTheme.ink }}
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>
                {promo.eyebrow}
              </p>
              <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-3 max-w-3xl text-3xl font-black uppercase leading-tight tracking-normal">
                {promo.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
                {promo.body}
              </p>
            </div>
            <a
              href="#booking"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-[var(--sked-control-radius)] bg-[#b9f34b] px-8 text-sm font-black uppercase text-[#071420] transition-colors hover:bg-[#a8ea2d]"
              style={{ backgroundColor: pageTheme.primary, color: primaryTextColor }}
            >
              {promo.ctaLabel}
              <ChevronRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div
          className="grid overflow-hidden rounded-[var(--sked-card-radius)] text-white lg:grid-cols-[1fr_340px]"
          style={{ backgroundColor: pageTheme.ink }}
        >
          <div className="p-8 md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>
              Book in
            </p>
            <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-2 text-4xl font-black uppercase tracking-normal">
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
                    <Icon className="mb-6 h-11 w-11" strokeWidth={1.55} style={{ color: pageTheme.primary }} />
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
            <Image
              src="/images/newbg.webp"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#071420] via-[#071420]/40 to-transparent lg:bg-gradient-to-l"
              style={{
                background: `linear-gradient(to right, ${pageTheme.ink}, ${pageTheme.ink}66, transparent)`,
              }}
            />
          </div>
        </div>
      </section>

      {gallery.enabled && galleryPhotos.length > 0 && (
        <section className={`border-b ${bandBorder}`} style={bandStyle}>
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>Gallery</p>
              <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-4 text-4xl font-black leading-tight tracking-normal">
                {gallery.title}
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleryPhotos.slice(0, 6).map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  className="group relative min-h-64 overflow-hidden rounded-[var(--sked-control-radius)]"
                  style={{ backgroundColor: pageTheme.ink }}
                >
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials.enabled && testimonials.quotes.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-16 text-center sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>
            What players are saying
          </p>
          <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-3 text-3xl font-black tracking-normal">
            {testimonials.title}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.quotes.slice(0, 3).map((quote, index) => (
              // No star row and no byline. Owner-authored quotes carry neither
              // a rating nor an author in the data model, so both were
              // invented at render time — five stars nobody awarded, over a
              // "Player N" nobody is. Real ratings and names arrive with
              // published reviews (T-9.2.1).
              <article
                key={`${quote}-${index}`}
                className="rounded-[var(--sked-control-radius)] p-8 text-left shadow-[0_14px_40px_rgba(7,20,32,0.08)]"
                style={{ backgroundColor: pageTheme.card, color: pageTheme.ink }}
              >
                <p className="text-base leading-7">&quot;{quote}&quot;</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {faq.enabled && faq.items.length > 0 && (
        <section className={`border-y ${bandBorder}`} style={bandStyle}>
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: pageTheme.primary }}>
                FAQ
              </p>
              <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="mt-4 text-4xl font-black leading-tight tracking-normal">
                {faq.title}
              </h2>
            </div>
            <div className="mt-10 divide-y divide-[#e7e9e2]">
              {faq.items.map((item, index) => (
                <article
                  key={`${item.question}-${index}`}
                  className="grid gap-3 py-6 md:grid-cols-[280px_minmax(0,1fr)]"
                >
                  <h3 style={{ fontFamily: "var(--sked-heading-font)" }} className="text-base font-black text-[#071420]">
                    {item.question}
                  </h3>
                  <p className="text-base leading-7 text-[#5f695c]">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <div
          className="grid items-center gap-6 overflow-hidden rounded-[var(--sked-card-radius)] p-6 text-white md:grid-cols-[220px_1fr_auto] md:p-8"
          style={{ backgroundColor: pageTheme.ink }}
        >
          {/* Sits in a grid cell with no positioned ancestor, so this one is
              sized intrinsically rather than with `fill`; the CSS classes still
              govern the rendered box. */}
          <Image
            src="/images/newbg.webp"
            alt=""
            width={440}
            height={256}
            sizes="(max-width: 768px) 100vw, 220px"
            className="h-32 w-full rounded-[var(--sked-control-radius)] object-cover md:h-24"
          />
          <div>
            <h2 style={{ fontFamily: "var(--sked-heading-font)" }} className="text-2xl font-black uppercase">Ready to play?</h2>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Book your court now and get out on the court.
            </p>
          </div>
          <a
            href="#booking"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-[var(--sked-control-radius)] bg-[#b9f34b] px-8 text-sm font-black uppercase text-[#071420] transition-colors hover:bg-[#a8ea2d]"
            style={{ backgroundColor: pageTheme.primary, color: primaryTextColor }}
          >
            {hero.primaryCta || "Book your court"}
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {(contact.enabled || socialLinks.length > 0 || pageData.plan === "trial") && (
        <footer className={`border-t ${bandBorder}`} style={bandStyle}>
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#5f695c] sm:px-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="font-black" style={{ color: pageTheme.ink }}>{displayName}</p>
              {contact.enabled && contactItems.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {contactItems.map(({ text, Icon }) => (
                    <span key={text} className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: pageTheme.primary }} />
                      {text}
                    </span>
                  ))}
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
                  style={{ color: pageTheme.ink, borderColor: pageTheme.muted }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
              {pageData.plan === "trial" && (
                <a
                  href="https://sked.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#071420] hover:underline"
                  style={{ color: pageTheme.ink }}
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
