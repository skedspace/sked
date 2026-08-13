import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured, type SendResult } from "./email";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
  type BookingEmailData,
} from "./templates";

/**
 * Booking notifications — the pipeline T-2.3.5 claimed and never had.
 *
 * Runs with the admin client on purpose. A public booking executes as `anon`,
 * which by design (00044/00045) can read neither `customers` nor `bookings`,
 * so the anon client cannot assemble the venue and customer details an email
 * needs. Everything here is server-side and reached only from server actions.
 *
 * Like `sendEmail`, nothing in this module throws. The caller is the booking
 * path, and a notification must never be able to fail a booking.
 */

type NotificationContext = {
  bookingId: string;
  orgId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  resourceId?: string | null;
  serviceId?: string | null;
  priceCents: number;
};

/** Parses Postgres tstzrange literals like `["2026-08-10 10:00+08","...")`. */
export function parseTimeRange(range: string | null | undefined): { start: Date; end: Date } | null {
  if (!range) return null;
  const match = range.match(/[[(]"?([^",]+)"?,\s*"?([^")\]]+)"?[)\]]/);
  if (!match?.[1] || !match[2]) return null;
  const start = new Date(match[1]);
  const end = new Date(match[2]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

/**
 * Venue-side details the templates need. Kept in one query path so a failure
 * here degrades to sensible names rather than aborting the notification.
 */
async function loadVenueContext(orgId: string, resourceId?: string | null, serviceId?: string | null) {
  const admin = createAdminClient();

  const [orgResult, settingsResult, resourceResult, serviceResult] = await Promise.all([
    admin.from("organizations").select("name, contact_email, contact_phone").eq("id", orgId).maybeSingle(),
    admin.from("org_settings").select("timezone").eq("org_id", orgId).maybeSingle(),
    resourceId
      ? admin.from("resources").select("name").eq("id", resourceId).maybeSingle()
      : Promise.resolve({ data: null }),
    serviceId
      ? admin.from("services").select("name").eq("id", serviceId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const org = orgResult.data as { name?: string; contact_email?: string | null; contact_phone?: string | null } | null;

  return {
    venueName: org?.name || "your venue",
    venueEmail: org?.contact_email ?? null,
    venuePhone: org?.contact_phone ?? null,
    // The org's own zone, never the server's. On Vercel the server runs in UTC,
    // which would render a 7pm Manila booking as 11am.
    timezone: (settingsResult.data as { timezone?: string } | null)?.timezone || "Asia/Manila",
    resourceName: (resourceResult.data as { name?: string } | null)?.name ?? null,
    serviceName: (serviceResult.data as { name?: string } | null)?.name ?? null,
  };
}

async function buildEmailData(context: NotificationContext): Promise<BookingEmailData> {
  const venue = await loadVenueContext(context.orgId, context.resourceId, context.serviceId);
  return {
    venueName: venue.venueName,
    customerName: context.customerName || "there",
    bookingId: context.bookingId,
    startsAt: context.startsAt,
    endsAt: context.endsAt,
    timezone: venue.timezone,
    resourceName: venue.resourceName,
    serviceName: venue.serviceName,
    priceCents: context.priceCents,
    venueEmail: venue.venueEmail,
    venuePhone: venue.venuePhone,
  };
}

export async function sendBookingConfirmation(context: NotificationContext): Promise<SendResult> {
  try {
    if (!isEmailConfigured()) {
      return { status: "skipped", reason: "resend_not_configured" };
    }
    if (!context.customerEmail) {
      return { status: "skipped", reason: "no_valid_recipient" };
    }
    const data = await buildEmailData(context);
    const message = bookingConfirmationEmail(data);
    return await sendEmail({ to: context.customerEmail, ...message });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_notification_error";
    console.error("[notifications] Failed to build the confirmation email:", reason);
    return { status: "failed", reason };
  }
}

/**
 * Cancellation notice. Loads the booking itself, because `cancelBooking` is
 * given only an id — and reads the customer through the admin client, which is
 * the only path with access to `customers` after 00044.
 */
export async function sendBookingCancellation(
  bookingId: string,
  reason?: string | null,
): Promise<SendResult> {
  try {
    if (!isEmailConfigured()) {
      return { status: "skipped", reason: "resend_not_configured" };
    }
    const admin = createAdminClient();
    const { data: booking } = await admin
      .from("bookings")
      .select("id, org_id, resource_id, service_id, time_range, price_cents, customer_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return { status: "skipped", reason: "booking_not_found" };

    const range = parseTimeRange((booking as { time_range?: string }).time_range);
    if (!range) return { status: "skipped", reason: "unparsable_time_range" };

    const { data: customer } = await admin
      .from("customers")
      .select("name, email")
      .eq("id", (booking as { customer_id: string }).customer_id)
      .maybeSingle();

    const email = (customer as { email?: string | null } | null)?.email ?? "";
    if (!email) return { status: "skipped", reason: "no_valid_recipient" };

    const data = await buildEmailData({
      bookingId,
      orgId: (booking as { org_id: string }).org_id,
      customerName: (customer as { name?: string } | null)?.name || "there",
      customerEmail: email,
      startsAt: range.start,
      endsAt: range.end,
      resourceId: (booking as { resource_id?: string | null }).resource_id,
      serviceId: (booking as { service_id?: string | null }).service_id,
      priceCents: (booking as { price_cents?: number }).price_cents ?? 0,
    });

    const message = bookingCancellationEmail({ ...data, reason });
    return await sendEmail({ to: email, ...message });
  } catch (err) {
    const failure = err instanceof Error ? err.message : "unknown_notification_error";
    console.error("[notifications] Failed to send the cancellation email:", failure);
    return { status: "failed", reason: failure };
  }
}
