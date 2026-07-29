import { NextResponse } from "next/server";
import {
  activateCheckout,
  finishWebhookEvent,
  getCheckout,
  markCheckout,
  releaseWebhookEvent,
  reserveWebhookEvent,
} from "@/lib/platform-subscriptions";
import { isPayMongoTestMode, verifyPayMongoSignature } from "@/lib/payments/platform-paymongo";

type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      created_at?: number;
      data?: {
        id?: string;
        attributes?: {
          reference_number?: string;
          payments?: Array<{ id?: string }>;
          payment_intent?: { id?: string };
        };
      };
    };
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPayMongoSignature(raw, request.headers.get("paymongo-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let reservedEventId: string | null = null;
  try {
    const event = JSON.parse(raw) as PayMongoEvent;
    const eventId = event.data?.id;
    const attributes = event.data?.attributes;
    const eventType = attributes?.type;
    const resource = attributes?.data;
    const livemode = Boolean(attributes?.livemode);
    if (!eventId || !eventType || !resource) {
      return NextResponse.json({ error: "Malformed event." }, { status: 400 });
    }
    if (livemode === isPayMongoTestMode()) {
      return NextResponse.json({ error: "Webhook mode does not match configured keys." }, { status: 400 });
    }
    if (!await reserveWebhookEvent(eventId, eventType, livemode, raw)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    reservedEventId = eventId;

    const checkoutId = resource.attributes?.reference_number;
    if (!checkoutId) {
      await finishWebhookEvent(eventId, "ignored");
      return NextResponse.json({ received: true, ignored: true });
    }
    const checkout = await getCheckout(checkoutId);
    if (!checkout || checkout.paymongo_checkout_session_id !== resource.id) {
      return NextResponse.json({ error: "Checkout reference mismatch." }, { status: 400 });
    }

    if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
      const paymentId =
        resource.attributes?.payments?.[0]?.id ??
        resource.attributes?.payment_intent?.id;
      if (!paymentId) return NextResponse.json({ error: "Paid event has no payment reference." }, { status: 400 });
      const paidAt = new Date((attributes.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
      await activateCheckout(checkout.id, paymentId, paidAt);
    } else if (eventType === "payment.failed" || eventType === "checkout_session.payment.failed") {
      await markCheckout(checkout.id, "failed");
    } else if (eventType === "checkout_session.expired") {
      await markCheckout(checkout.id, "expired");
    } else {
      await finishWebhookEvent(eventId, "ignored");
      return NextResponse.json({ received: true, ignored: true });
    }
    await finishWebhookEvent(eventId, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    if (reservedEventId) await releaseWebhookEvent(reservedEventId, error);
    console.error("[platform PayMongo webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
