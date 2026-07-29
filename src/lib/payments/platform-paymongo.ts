import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const API_URL = "https://api.paymongo.com/v1";

type CheckoutSession = {
  id: string;
  attributes: {
    checkout_url: string;
    status?: string;
    reference_number?: string;
    payments?: Array<{ id: string; attributes?: { status?: string } }>;
  };
};

function secretKey() {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  if (!key.startsWith("sk_test_") && process.env.NODE_ENV !== "production") {
    throw new Error("Development checkout requires a PayMongo test secret key.");
  }
  return key;
}

function authHeader() {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

export function isPayMongoTestMode() {
  return secretKey().startsWith("sk_test_");
}

export async function createPlatformCheckoutSession(input: {
  checkoutId: string;
  amountCents: number;
  termMonths: number;
  customerEmail?: string;
  origin: string;
}) {
  const label = input.termMonths === 1 ? "Monthly" : `${input.termMonths / 12} Year`;
  const response = await fetch(`${API_URL}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: input.customerEmail ? { email: input.customerEmail } : undefined,
          cancel_url: `${input.origin}/pricing?checkout=canceled`,
          description: `SKED Premium ${label} platform subscription`,
          line_items: [{
            amount: input.amountCents,
            currency: "PHP",
            description: `${input.termMonths} month SKED Premium access`,
            name: `SKED Premium - ${label}`,
            quantity: 1,
          }],
          merchant: "SKED",
          payment_method_types: ["card", "gcash", "grab_pay", "paymaya"],
          reference_number: input.checkoutId,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          success_url: `${input.origin}/checkout/success?checkout_id=${input.checkoutId}`,
        },
      },
    }),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.errors?.[0]?.detail ?? "PayMongo could not create checkout.");
  }
  return body.data as CheckoutSession;
}

export function verifyPayMongoSignature(rawBody: string, header: string | null) {
  if (!header) return false;
  const values = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const timestamp = values.t;
  const signature = isPayMongoTestMode() ? values.te : values.li;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secretKey())
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
