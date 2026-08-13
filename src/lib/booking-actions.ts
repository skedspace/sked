"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
} from "@/lib/notifications/booking-notifications";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string; alternatives?: Array<{ start_time: string; resource_name: string }> };

export async function createBooking(formData: FormData): Promise<BookingResult> {
  const supabase = createClient();

  const serviceId = formData.get("service_id") as string;
  const resourceId = formData.get("resource_id") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const customerName = formData.get("name") as string;
  const customerEmail = formData.get("email") as string;
  const customerPhone = formData.get("phone") as string;
  const orgId = formData.get("org_id") as string;
  const priceCents = parseInt(formData.get("price_cents") as string, 10);
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");
  const idempotencyKey = formData.get("idempotency_key") as string || randomUUID();

  if (!serviceId || !resourceId || !startTime || !customerName || !orgId) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    // 1. Find or create customer.
    // This runs as `anon` for public bookings, which cannot read the customers
    // table — by design, since the anon key is public. find_or_create_customer
    // is SECURITY DEFINER: it matches on email then phone within this org and
    // inserts when nothing matches, returning only the id. See migration 00044.
    const { data: resolvedCustomerId, error: customerError } = await supabase.rpc(
      "find_or_create_customer",
      {
        p_org_id: orgId,
        p_name: customerName,
        p_email: customerEmail || null,
        p_phone: customerPhone || null,
      },
    );

    if (customerError || !resolvedCustomerId) {
      return {
        success: false,
        error: customerError?.message ?? "Failed to create customer.",
      };
    }

    const customerId: string = resolvedCustomerId;

    // 2. Check plan limits before creating booking
    const { data: planCheck } = await supabase.rpc("can_create_booking", {
      p_org_id: orgId,
    });

    if (planCheck && planCheck.length > 0 && !planCheck[0].allowed) {
      return {
        success: false,
        error: planCheck[0].reason ?? "Monthly booking limit reached.",
      };
    }

    // 3. Create the booking.
    // Public bookings run as `anon`, which has no privileges on bookings at all
    // — a direct insert cannot return the new id, because PostgREST's RETURNING
    // is gated by a SELECT policy anon must not have. create_public_booking is
    // SECURITY DEFINER: it re-validates the target, applies the idempotency key,
    // links the customer to a player record, and returns the id. See 00045.
    const { data: newBookingId, error } = await supabase.rpc(
      "create_public_booking",
      {
        p_org_id: orgId,
        p_resource_id: resourceId,
        p_service_id: serviceId,
        p_customer_id: customerId,
        p_start: startTime,
        p_end: endTime,
        p_price_cents: priceCents,
        p_idempotency_key: idempotencyKey,
        p_customer_name: customerName,
        p_customer_email: customerEmail || null,
        p_customer_phone: customerPhone || null,
      },
    );

    if (error) {
      // The RPC raises this token when the double-booking exclusion constraint
      // fires, so the slot-taken path stays distinguishable from real failures.
      if (error.message?.includes("SLOT_TAKEN")) {
        const slug = formData.get("org_slug") as string;
        const date = startTime.split("T")[0];
        const { data: alternatives } = await supabase.rpc("get_available_slots", {
          p_org_slug: slug,
          p_service_id: serviceId,
          p_date: date,
        });

        return {
          success: false,
          error: "That slot was just taken. Please choose another.",
          alternatives: (alternatives ?? []).slice(0, 3).map((a: any) => ({
            start_time: a.start_time,
            resource_name: a.resource_name,
          })),
        };
      }

      return { success: false, error: error.message };
    }

    if (!newBookingId) {
      return { success: false, error: "Failed to create the booking." };
    }

    const booking = { id: newBookingId as string };

    // 5. Increment usage counter and log audit
    await supabase.rpc("increment_usage", { p_org_id: orgId });
    if (priceCents > 0) {
      const admin = createAdminClient();
      const { data: settings } = await admin
        .from("org_settings")
        .select("payment_methods")
        .eq("org_id", orgId)
        .maybeSingle();
      const methods = Array.isArray(settings?.payment_methods)
        ? (settings.payment_methods as Array<Record<string, unknown>>)
        : [];
      const selected = methods.find((method) => method.id === paymentMethodId);
      const methodName = typeof selected?.name === "string" ? selected.name : "Manual payment";
      await admin.from("payments").insert({
        booking_id: booking.id,
        org_id: orgId,
        customer_id: customerId,
        provider: "manual",
        provider_ref: `manual-${booking.id}`,
        type: "full",
        amount_cents: priceCents,
        status: "pending",
        category: "booking",
        payment_method: methodName,
        description: "Awaiting customer manual payment verification.",
      });
    }
    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: (await supabase.auth.getSession()).data.session?.user.id ?? "00000000-0000-0000-0000-000000000000",
      action: "booking.created",
      target: `booking:${booking.id}`,
      payload: { resource_id: resourceId, service_id: serviceId, source: "public" },
    });

    // 6. Confirmation email. Awaited rather than fired and forgotten, because
    // a serverless function can be frozen the moment the response is returned
    // and a dangling promise would simply never run. It cannot fail the
    // booking: sendBookingConfirmation returns a status and never throws, and
    // the result is deliberately not consulted — the booking is already
    // committed, and the customer sees the confirmation screen either way.
    await sendBookingConfirmation({
      bookingId: booking.id,
      orgId,
      customerName,
      customerEmail,
      startsAt: new Date(startTime),
      endsAt: new Date(endTime),
      resourceId,
      serviceId,
      priceCents,
    });

    revalidatePath("/dashboard");
    return { success: true, bookingId: booking.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const supabase = createClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason ?? null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  const { data: cancelledBooking } = await supabase
    .from("bookings")
    .select("org_id, resource_id, service_id, time_range")
    .eq("id", bookingId)
    .single();

  if (cancelledBooking) {
    const rangeMatch = cancelledBooking.time_range?.match(
      /\[([^,]+),([^\]]+)/,
    );
    const startTime = rangeMatch?.[1] ? new Date(rangeMatch[1]) : null;
    if (startTime) {
      const dateStr = startTime.toISOString().split("T")[0];
      const timeStr = startTime.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      await supabase.rpc("notify_waitlist_for_slot", {
        p_org_id: cancelledBooking.org_id,
        p_resource_id: cancelledBooking.resource_id,
        p_service_id: cancelledBooking.service_id,
        p_desired_date: dateStr,
        p_desired_start_time: timeStr,
      });
    }
  }

  // Tell the customer their booking is gone. Until now cancellation was
  // entirely silent from their side — the owner cancelled in the dashboard and
  // the customer found out by turning up. Never throws; see email.ts.
  await sendBookingCancellation(bookingId, reason);

  revalidatePath("/dashboard");
  return { success: true };
}
