import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PayMongo Webhook Handler
 *
 * Receives payment events from PayMongo and updates booking status.
 * Idempotent — replayed events don't double-process.
 *
 * Webhook URL: POST /api/webhooks/paymongo
 *
 * PayMongo events handled:
 *   - payment.paid       → booking confirmed
 *   - payment.failed     → booking released
 *   - payment.refunded   → payment refunded
 */

export async function POST(request: Request) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const event = body.data;

    if (!event?.attributes?.data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const paymentData = event.attributes.data;
    const paymentId = paymentData.id;
    const status = paymentData.attributes?.status;
    const metadata = paymentData.attributes?.metadata ?? {};

    // Only process if we have booking metadata
    const bookingId = metadata.booking_id;
    if (!bookingId) {
      return NextResponse.json({ accepted: true });
    }

    // Check idempotency — has this payment been processed?
    const { data: existing } = await supabase
      .from("payments")
      .select("id, status")
      .eq("provider_ref", paymentId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ accepted: true, existing: true });
    }

    // Map PayMongo status to internal status
    const paymentStatusMap: Record<string, string> = {
      paid: "succeeded",
      failed: "failed",
      refunded: "refunded",
      pending: "pending",
    };

    const internalStatus = paymentStatusMap[status] ?? "pending";

    // Insert payment record
    await supabase.from("payments").insert({
      booking_id: bookingId,
      provider: "paymongo",
      provider_ref: paymentId,
      type: metadata.payment_type ?? "full",
      amount_cents: paymentData.attributes?.amount ?? 0,
      status: internalStatus,
    });

    // Update booking status based on payment
    if (internalStatus === "succeeded") {
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);
    } else if (internalStatus === "failed") {
      await supabase
        .from("bookings")
        .update({ status: "cancelled", cancellation_reason: "Payment failed" })
        .eq("id", bookingId)
        .eq("status", "pending"); // Only cancel if still pending
    }

    // Log audit
    await supabase.from("audit_log").insert({
      org_id: metadata.org_id ?? "unknown",
      actor_id: "00000000-0000-0000-0000-000000000000", // System
      action: `payment.${internalStatus}`,
      target: `booking:${bookingId}`,
      payload: { provider_ref: paymentId, payment_status: internalStatus },
    });

    return NextResponse.json({ accepted: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
