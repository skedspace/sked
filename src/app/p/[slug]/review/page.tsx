import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicPageTheme, readPublicPageSections } from "@/lib/public-page";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createClient();
  const { data } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();

  if (!data) return { title: "Leave a review" };

  const sections = readPublicPageSections(data.sections, {
    brandName: data.org_name,
  });
  const name = sections.storefront.hero.brandName || data.org_name;
  // The root layout already applies a "%s | SKED" template — appending SKED
  // here too is what produced "… | SKED | SKED" on the storefront (T-9.3.5).
  return {
    title: `Leave a review for ${name}`,
    // A review form has nothing to rank for and should not compete with the
    // venue's own page in search results.
    robots: { index: false, follow: false },
  };
}

/**
 * T-9.1.3 — the public review form.
 *
 * Reached from a printed QR at the venue rather than from an email, because
 * the email pipeline does not exist (T-9.1.6) and because a player standing on
 * the court just after a good game is the highest-converting moment we can
 * reach. That also means the booking date can default to today: the QR is
 * scanned on the day of play, so the common case is one tap.
 *
 * Verification is the booking-lookup model from T-9.1.1 — contact plus date,
 * checked inside `submit_public_review`. Everything lands `pending`.
 */
export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient();
  const { data: pageData } = await supabase
    .rpc("get_public_page", { page_slug: slug })
    .maybeSingle();

  if (!pageData || !pageData.is_published) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f4] p-8 text-center">
        <h1 className="mb-3 text-3xl font-black tracking-[-0.04em] text-[#071420]">
          Not available
        </h1>
        <p className="max-w-sm text-sm leading-7 text-[#626860]">
          This venue isn&apos;t accepting reviews right now.
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
  const displayName =
    sections.storefront.hero.brandName || pageData.org_name || "this venue";
  const pageTheme = getPublicPageTheme(
    pageData.theme || "default",
    pageData.primary_color,
  );

  // Today in the venue's own terms. The QR is scanned at the venue, so the
  // date the player means is the venue's today, not the phone's UTC date —
  // those differ for a late evening game in Asia/Manila.
  const todayAtVenue = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  return (
    <main
      className="min-h-screen px-5 py-12 sm:px-8"
      style={
        {
          backgroundColor: pageTheme.paper,
          color: pageTheme.ink,
          fontFamily: pageTheme.bodyFont,
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
      <div className="mx-auto w-full max-w-lg">
        <ReviewForm
          slug={slug}
          venueName={displayName}
          defaultDate={todayAtVenue}
          googleReviewUrl={pageData.google_review_url ?? ""}
          logoUrl={sections.storefront.hero.logoUrl || pageData.logo_url || ""}
        />
      </div>
    </main>
  );
}
