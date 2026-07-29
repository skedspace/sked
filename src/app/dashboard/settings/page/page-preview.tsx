"use client";

import { useState } from "react";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Facebook,
  Globe2,
  Instagram,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicPageContent } from "@/app/p/[slug]/public-page-content";
import type { PublicPageSections } from "@/lib/public-page";
import { getContrastText } from "@/lib/utils";

type PreviewProps = {
  orgName: string;
  facebook: string;
  instagram: string;
  website: string;
  theme: string;
  primaryColor: string;
  inkColor: string;
  paperColor: string;
  mutedColor: string;
  coverUrl: string;
  logoUrl: string;
  slug: string;
  orgId: string;
  view: string;
  sections: PublicPageSections;
};

type View = "storefront" | "booking";

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

const BOOKING_STEPS: Array<{ title: string; Icon: LucideIcon }> = [
  { title: "Choose Date & Time", Icon: CalendarDays },
  { title: "Select Players", Icon: UsersRound },
  { title: "Confirm & Play", Icon: CheckCircle2 },
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

export function PagePreview({
  orgName,
  facebook,
  instagram,
  website,
  primaryColor = "#b9f34b",
  inkColor = "#071420",
  paperColor = "#f8f9f5",
  mutedColor = "#5f695c",
  slug,
  orgId,
  view,
  sections,
}: PreviewProps) {
  const [tab, setTab] = useState<View>(() => (view === "storefront" || view === "booking" ? view : "storefront"));
  const activeTab = tab;
  const hero = sections.storefront.hero;
  const about = sections.storefront.about;
  const amenities = sections.storefront.amenities;
  const courts = sections.storefront.courts;
  const gallery = sections.storefront.gallery;
  const promo = sections.storefront.promo;
  const testimonials = sections.storefront.testimonials;
  const faq = sections.storefront.faq;
  const displayName = orgName || "Ace Pickleball";
  const cover = hero.coverUrl || FALLBACK_HERO;
  const logo = hero.logoUrl || "";
  const headline = splitHeadline(hero.headline || "Play More. Wait Less.");
  const photos = gallery.photos.length > 0 ? gallery.photos : FALLBACK_GALLERY;
  const amenityIcons = [Trophy, Moon, Car, Sparkles];
  const socialLinks = [
    { href: facebook, label: "Facebook", Icon: Facebook },
    { href: instagram, label: "Instagram", Icon: Instagram },
    { href: website, label: "Website", Icon: Globe2 },
  ].filter((item) => item.href);

  return (
    <div>
      <div className="mx-auto mb-4 grid max-w-sm grid-cols-2 rounded-full bg-black/[0.07] p-1">
        {(["storefront", "booking"] as View[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="min-h-10 rounded-full px-5 text-sm font-black transition-all"
            style={{
              background: activeTab === id ? paperColor : "transparent",
              color: activeTab === id ? inkColor : mutedColor,
              boxShadow:
                activeTab === id ? "0 1px 8px rgba(23,26,22,0.08)" : "none",
            }}
          >
            {id === "storefront" ? "Storefront" : "Booking"}
          </button>
        ))}
      </div>

      <div className="max-h-[860px] overflow-y-auto rounded-xl border border-black/[0.08]" style={{ backgroundColor: paperColor, boxShadow: "0 18px 42px rgba(23,26,22,0.08)" }}>
        {activeTab === "storefront" ? (
          <div>
            <section className="relative isolate min-h-[560px] overflow-hidden p-6 text-white" style={{ backgroundColor: inkColor }}>
              {hero.enabled && (
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 -z-20 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,10,17,0.94),rgba(2,10,17,0.72)_48%,rgba(2,10,17,0.5))]" />
              <div className="mb-16 flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full text-sm font-black" style={{ backgroundColor: primaryColor, color: getContrastText(primaryColor) }}>
                    {initials(displayName) || "P"}
                  </span>
                )}
                <div>
                  <p className="text-xl font-black uppercase tracking-[0.12em] text-white">
                    {displayName}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: primaryColor }}>
                    {hero.publicLabel || "Public bookings"}
                  </p>
                </div>
              </div>

              {hero.enabled && (
                <>
                  <h1 className="max-w-xl text-5xl font-black uppercase leading-[0.95] tracking-normal">
                    {headline.lead}
                    {headline.accent && (
                      <span className="block" style={{ color: primaryColor }}>
                        {headline.accent}
                      </span>
                    )}
                  </h1>
                  <p className="mt-5 max-w-lg text-lg font-medium leading-7 text-white/84">
                    {hero.subheadline}
                  </p>
                </>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {HERO_FEATURES.map(({ label, Icon }) => (
                  <div key={label}>
                    <Icon className="mb-3 h-8 w-8" strokeWidth={1.6} style={{ color: primaryColor }} />
                    <p className="text-xs font-black uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {amenities.enabled && amenities.items.length > 0 && (
              <section className="grid bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
                {amenities.items.slice(0, 4).map((item, index) => {
                  const Icon = amenityIcons[index % amenityIcons.length]!;
                  return (
                    <div key={`${item}-${index}`} className="p-4 text-center">
                      <Icon className="mx-auto mb-4 h-9 w-9" strokeWidth={1.55} style={{ color: primaryColor }} />
                      <p className="text-xs font-black uppercase">{item}</p>
                    </div>
                  );
                })}
              </section>
            )}

            {about.enabled && (
              <section className="border-b border-black/[0.08] bg-white p-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                  About
                </p>
                <h2 className="mx-auto mt-3 max-w-xl text-3xl font-black tracking-normal text-[#071420]">
                  {about.title}
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5f695c]">
                  {about.body}
                </p>
              </section>
            )}

            {courts.enabled && (
              <section className="grid gap-6 p-6 lg:grid-cols-[200px_minmax(0,1fr)]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                    Courts
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-normal">
                    {courts.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#5f695c]">
                    {courts.intro || "Choose a court that fits your match, then reserve in seconds."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {photos.slice(0, 3).map((photo, index) => (
                    <article
                      key={`${photo}-${index}`}
                      className="relative min-h-56 overflow-hidden rounded-xl"
                      style={{ backgroundColor: inkColor }}
                    >
                      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#03101b] via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <p className="text-[10px] font-semibold uppercase text-white/70">
                          Court {index + 1}
                        </p>
                        <h3 className="mt-1 text-sm font-black uppercase">
                          Court {index + 1}
                        </h3>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {gallery.enabled && (
              <section className="border-t border-black/[0.08] bg-white p-6">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                    Gallery
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-normal text-[#071420]">
                    {gallery.title}
                  </h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {photos.slice(0, 6).map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="relative min-h-40 overflow-hidden rounded-xl bg-[#071420]"
                    >
                      <img
                        src={photo}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {promo.enabled && (
              <section className="p-6">
                <div className="grid items-center gap-4 rounded-2xl p-5 text-white md:grid-cols-[1fr_auto]" style={{ backgroundColor: inkColor }}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                      {promo.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-normal">
                      {promo.title}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
                      {promo.body}
                    </p>
                  </div>
                  <span className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-xs font-black uppercase" style={{ backgroundColor: primaryColor, color: getContrastText(primaryColor) }}>
                    {promo.ctaLabel}
                  </span>
                </div>
              </section>
            )}

            <section className="p-6">
              <div className="grid overflow-hidden rounded-2xl bg-[#071420] text-white lg:grid-cols-[1fr_220px]">
                <div className="p-7">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                    Book in
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase tracking-normal">
                    3 simple steps
                  </h2>
                  <div className="mt-8 grid gap-5 sm:grid-cols-3">
                    {BOOKING_STEPS.map(({ title, Icon }, index) => {
                      const stepTitle =
                        index === 0
                          ? sections.booking.service.title
                          : index === 1
                            ? sections.booking.dateTime.title
                            : sections.booking.confirmation.title;
                      return (
                        <div key={title}>
                          <Icon className="mb-4 h-9 w-9" strokeWidth={1.55} style={{ color: primaryColor }} />
                          <p className="text-xs font-black">
                            {index + 1}. {stepTitle || title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <img src="/images/newbg.webp" alt="" className="h-full min-h-56 w-full object-cover" />
              </div>
            </section>

            {testimonials.enabled && testimonials.quotes.length > 0 && (
              <section className="p-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                  What players are saying
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-normal">
                  {testimonials.title}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {testimonials.quotes.slice(0, 3).map((quote, index) => (
                    <article
                      key={`${quote}-${index}`}
                      className="rounded-xl bg-white p-5 text-left shadow-[0_14px_40px_rgba(7,20,32,0.08)]"
                    >
                      <div className="mb-3 flex gap-1" style={{ color: primaryColor }}>
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm leading-6 text-[#273220]">
                        &quot;{quote}&quot;
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {faq.enabled && faq.items.length > 0 && (
              <section className="p-6">
                <h2 className="text-2xl font-black tracking-normal">
                  {faq.title}
                </h2>
                <div className="mt-4 divide-y divide-black/[0.08] rounded-xl bg-white px-5">
                  {faq.items.slice(0, 4).map((item, index) => (
                    <article key={`${item.question}-${index}`} className="py-4">
                      <h3 className="text-sm font-black text-[#071420]">
                        {item.question}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#5f695c]">
                        {item.answer}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="p-6">
              <div className="grid items-center gap-4 rounded-2xl bg-[#071420] p-5 text-white md:grid-cols-[1fr_auto]">
                <div>
                  <h2 className="text-2xl font-black uppercase">
                    Ready to play?
                  </h2>
                  <p className="mt-2 text-sm text-white/72">
                    Book your court now and get out on the court.
                  </p>
                </div>
                <span className="inline-flex min-h-11 items-center justify-center gap-3 rounded-xl px-6 text-xs font-black uppercase" style={{ backgroundColor: primaryColor, color: getContrastText(primaryColor) }}>
                  {hero.primaryCta || "Book your court"}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </section>

            {sections.storefront.contact.enabled && (
              <section className="border-t p-6" style={{ borderColor: mutedColor + "20", backgroundColor: "#fff" }}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                      Location
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#071420]">
                      {sections.storefront.contact.address}
                    </p>
                    <p className="text-sm text-[#5f695c]">
                      {sections.storefront.contact.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                      Hours
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#5f695c]">
                      {sections.storefront.contact.hours}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                      Phone
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#071420]">
                      {sections.storefront.contact.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                      Email
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#071420]">
                      {sections.storefront.contact.email}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {socialLinks.length > 0 && (
              <footer className="flex flex-wrap gap-3 border-t p-6" style={{ borderColor: mutedColor + "20", backgroundColor: "#fff" }}>
                {socialLinks.map(({ href, label, Icon }) => (
                  <span
                    key={href}
                    className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                ))}
              </footer>
            )}
          </div>
        ) : (
          <div className="p-5 sm:p-6" style={{ backgroundColor: inkColor }}>
            <PublicPageContent
              slug={slug}
              orgId={orgId}
              services={[]}
              initialDate={null}
              initialService={null}
              isPreview={true}
              tone="dark"
              primaryColor={primaryColor}
              inkColor={inkColor}
              mutedColor={mutedColor}
              bookingCopy={{
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
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
