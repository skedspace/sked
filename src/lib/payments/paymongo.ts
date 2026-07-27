/**
 * PayMongo Payment Provider Integration
 *
 * PayMongo is the primary payment provider (GCash, Maya, cards).
 * See: https://developers.paymongo.com/docs
 */

const PAYMONGO_API = "https://api.paymongo.com/v1";

type PayMongoIntent = {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    status: string;
    payment_method_allowed: string[];
    payments: Array<{ id: string; attributes: { status: string } }>;
    metadata: Record<string, string>;
    created_at: number;
  };
};

export async function createPaymentIntent(params: {
  amountCents: number;
  currency?: string;
  description: string;
  bookingId: string;
  orgId: string;
}): Promise<{ clientKey: string; intentId: string }> {
  const { amountCents, currency = "PHP", description, bookingId, orgId } = params;

  const response = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        process.env.PAYMONGO_SECRET_KEY ?? "",
      ).toString("base64")}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCents,
          currency,
          description,
          statement_descriptor: "SKED BOOKING",
          metadata: {
            booking_id: bookingId,
            org_id: orgId,
          },
        },
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayMongo error: ${body.errors?.[0]?.detail ?? "Unknown error"}`,
    );
  }

  const intent = body.data as PayMongoIntent;

  // Create a payment method (requires client key for frontend)
  // Return the intent ID and client key
  return {
    clientKey: intent.id,
    intentId: intent.id,
  };
}

export async function attachPaymentMethod(intentId: string, paymentMethodId: string) {
  const response = await fetch(
    `${PAYMONGO_API}/payment_intents/${intentId}/attach`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          process.env.PAYMONGO_SECRET_KEY ?? "",
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
          },
        },
      }),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayMongo attach error: ${body.errors?.[0]?.detail ?? "Unknown error"}`,
    );
  }

  return body.data as PayMongoIntent;
}

export async function retrievePaymentIntent(intentId: string): Promise<PayMongoIntent> {
  const response = await fetch(`${PAYMONGO_API}/payment_intents/${intentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        process.env.PAYMONGO_SECRET_KEY ?? "",
      ).toString("base64")}`,
    },
  });

  const body = await response.json();
  return body.data as PayMongoIntent;
}
