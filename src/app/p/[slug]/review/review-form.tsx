"use client";

import { useState } from "react";
import { Star, Check, ExternalLink } from "lucide-react";
import { submitPublicReview } from "@/lib/review-actions";

/**
 * Whether the Google handoff is shown to every reviewer, or only to happy ones.
 *
 * It is deliberately `false`. Showing the Google link only to 4- and 5-star
 * reviewers is review gating — soliciting public reviews selectively by
 * sentiment — which Google's own contributed-content policy prohibits and
 * which the FTC's rule on consumer reviews treats as deceptive. The venue's
 * Business Profile is the asset at risk, so the safe default is equal
 * treatment: everyone who leaves a review is offered the same link.
 *
 * The first-party review is unaffected either way — it always lands `pending`
 * in the owner's moderation queue, so a critical review still reaches them.
 */
const GATE_GOOGLE_LINK_BY_RATING = false;

const RATING_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

export function ReviewForm({
  slug,
  venueName,
  defaultDate,
  googleReviewUrl,
  logoUrl,
}: {
  slug: string;
  venueName: string;
  defaultDate: string;
  googleReviewUrl: string;
  logoUrl: string;
}) {
  const [rating, setRating] = useState(0);
  const [contact, setContact] = useState("");
  const [bookingDate, setBookingDate] = useState(defaultDate);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (rating < 1) {
      setError("Please choose a rating.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("contact", contact);
    formData.set("booking_date", bookingDate);
    formData.set("rating", String(rating));
    formData.set("title", title);
    formData.set("body", body);

    const result = await submitPublicReview(formData);
    if (result.success) {
      setSubmitted(result.rating);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (submitted !== null) {
    const showGoogle =
      Boolean(googleReviewUrl) &&
      (!GATE_GOOGLE_LINK_BY_RATING || submitted >= 4);

    return (
      <div
        className="rounded-[var(--sked-card-radius)] p-8 text-center"
        style={{ backgroundColor: "var(--sked-card)" }}
      >
        <span
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--sked-primary)" }}
        >
          <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
        </span>
        <h1
          className="text-2xl font-black"
          style={{ fontFamily: "var(--sked-heading-font)" }}
        >
          Thank you!
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--sked-subtle-ink)" }}>
          Your review has been sent to {venueName}. It will appear on their page
          once they&apos;ve had a chance to read it.
        </p>

        {showGoogle && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sked-control-radius)] px-6 text-sm font-black"
            style={{ backgroundColor: "var(--sked-ink)", color: "var(--sked-paper)" }}
          >
            Also share it on Google
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mx-auto mb-4 h-14 w-14 rounded-full object-cover"
          />
        )}
        <h1
          className="text-3xl font-black leading-tight"
          style={{ fontFamily: "var(--sked-heading-font)" }}
        >
          How was your game?
        </h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--sked-subtle-ink)" }}>
          Leave a review for {venueName}.
        </p>
      </div>

      <fieldset
        className="rounded-[var(--sked-card-radius)] p-6"
        style={{ backgroundColor: "var(--sked-card)" }}
      >
        <legend className="sr-only">Rating</legend>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? "s" : ""} — ${RATING_LABELS[value - 1]}`}
              aria-pressed={rating === value}
              // 44px minimum touch target: this form is reached by scanning a
              // QR at the venue, so it is a phone-first surface (T-9.6.2).
              className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              <Star
                className="h-8 w-8"
                strokeWidth={1.75}
                style={{
                  color: "var(--sked-primary)",
                  fill: value <= rating ? "var(--sked-primary)" : "transparent",
                }}
              />
            </button>
          ))}
        </div>
        <p
          className="mt-3 text-center text-sm font-bold"
          // A fixed line reserves the space, so choosing a rating does not
          // shift the fields below out from under the user's thumb.
          style={{ color: rating ? "var(--sked-ink)" : "transparent" }}
        >
          {rating ? RATING_LABELS[rating - 1] : "placeholder"}
        </p>
      </fieldset>

      <div className="space-y-4">
        <Field label="Email or phone you booked with">
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className="w-full rounded-[var(--sked-control-radius)] border px-4 py-3 text-base"
            style={{ borderColor: "var(--sked-border)", backgroundColor: "var(--sked-card)" }}
          />
        </Field>

        <Field label="Date you played">
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            required
            className="w-full rounded-[var(--sked-control-radius)] border px-4 py-3 text-base"
            style={{ borderColor: "var(--sked-border)", backgroundColor: "var(--sked-card)" }}
          />
        </Field>

        <Field label="Headline">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Great courts, easy booking"
            className="w-full rounded-[var(--sked-control-radius)] border px-4 py-3 text-base"
            style={{ borderColor: "var(--sked-border)", backgroundColor: "var(--sked-card)" }}
          />
        </Field>

        <Field label="Your review">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            maxLength={2000}
            className="w-full rounded-[var(--sked-control-radius)] border px-4 py-3 text-base"
            style={{ borderColor: "var(--sked-border)", backgroundColor: "var(--sked-card)" }}
          />
        </Field>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--sked-control-radius)] px-4 py-3 text-sm leading-6"
          style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#b91c1c" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full rounded-[var(--sked-control-radius)] px-6 text-sm font-black uppercase disabled:opacity-60"
        style={{ backgroundColor: "var(--sked-primary)", color: "var(--sked-ink)" }}
      >
        {loading ? "Sending…" : "Submit review"}
      </button>

      <p className="text-center text-xs leading-5" style={{ color: "var(--sked-subtle-ink)" }}>
        Your review is sent to {venueName} for approval before it appears on
        their page.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
