"use client";

import { usePostHog } from "@/components/shared/posthog-provider";
import { useCallback } from "react";

/**
 * Hook to capture PostHog analytics events for key user actions.
 *
 * Privacy principles:
 *  - Event properties NEVER contain PII (email, name, phone, IP).
 *  - Authenticated owner flows use `identify` so PostHog can attribute
 *    events to known users; public booking events never identify.
 *  - Booking IDs are truncated to 8-char prefixes, never full UUIDs.
 *
 * Usage:
 *   const analytics = useAnalytics();
 *   analytics.trackServiceSelected("svc-1", "Court Rental", "deposit");
 */
export function useAnalytics() {
  const { capture, identify } = usePostHog();

  // ── Owner Setup Funnel ──────────────────────────────────────────

  /**
   * User completes sign-up (email/password or OAuth).
   * Identify is called so PostHog links subsequent events to this user.
   * Only a server-side hash of the email is set — the raw address is
   * never sent in event properties.
   */
  const trackSignUp = useCallback(
    (userId: string, emailHash?: string) => {
      identify(userId, emailHash ? { email_hash: emailHash } : undefined);
      capture("sign_up", { source: "email" });
    },
    [capture, identify],
  );

  /** Owner views the onboarding flow (org setup form). */
  const trackOnboardingStarted = useCallback(() => {
    capture("onboarding_started");
  }, [capture]);

  /** Owner successfully publishes their public booking page. */
  const trackPagePublished = useCallback(
    (slug: string, orgId: string) => {
      capture("page_published", { slug, org_id: orgId });
    },
    [capture],
  );

  // ── Public Booking Funnel ───────────────────────────────────────
  // These events are captured WITHOUT `identify` — no PII is ever
  // attached to anonymous visitor events.

  /** Customer selects a service on the public page. */
  const trackServiceSelected = useCallback(
    (serviceId: string, serviceName: string, paymentMode: string) => {
      capture("service_selected", {
        service_id: serviceId,
        service_name: serviceName,
        payment_mode: paymentMode,
      });
    },
    [capture],
  );

  /** Customer selects an available time slot. */
  const trackSlotSelected = useCallback(
    (serviceName: string) => {
      capture("slot_selected", { service_name: serviceName });
    },
    [capture],
  );

  /** Customer submits the booking form (name, email, phone entered). */
  const trackBookingStarted = useCallback(
    (serviceName: string) => {
      capture("booking_started", { service_name: serviceName });
    },
    [capture],
  );

  /** Payment attempt completes — success or failure. */
  const trackPaymentOutcome = useCallback(
    (
      paymentMode: string,
      outcome: "paid" | "pay_later" | "failed",
      amountCents: number,
    ) => {
      capture("payment_outcome", {
        payment_mode: paymentMode,
        outcome,
        amount_cents: amountCents,
      });
    },
    [capture],
  );

  /** Booking is confirmed after creation (and payment if required). */
  const trackBookingConfirmed = useCallback(
    (bookingId: string, serviceName: string) => {
      capture("booking_confirmed", {
        booking_id: bookingId.slice(0, 8),
        service_name: serviceName,
      });
    },
    [capture],
  );

  return {
    trackSignUp,
    trackOnboardingStarted,
    trackPagePublished,
    trackServiceSelected,
    trackSlotSelected,
    trackBookingStarted,
    trackPaymentOutcome,
    trackBookingConfirmed,
  };
}
