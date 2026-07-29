const secret = process.env.PAYMONGO_SECRET_KEY?.trim();
const appUrl = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

if (!secret?.startsWith("sk_test_") && !secret?.startsWith("sk_live_")) {
  throw new Error("PAYMONGO_SECRET_KEY is missing or invalid.");
}
if (!appUrl.startsWith("https://")) {
  throw new Error("Set APP_URL to the public HTTPS origin before registering the webhook.");
}

const url = `${appUrl}/api/webhooks/platform/paymongo`;
const listResponse = await fetch("https://api.paymongo.com/v1/webhooks", {
  headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
});
const list = await listResponse.json();
if (!listResponse.ok) throw new Error(list.errors?.[0]?.detail ?? "Could not list PayMongo webhooks.");

const existing = list.data?.find((item) => item.attributes?.url === url);
if (existing) {
  console.log(`Platform subscription webhook already registered: ${existing.id}`);
  process.exit(0);
}

const response = await fetch("https://api.paymongo.com/v1/webhooks", {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    data: {
      attributes: {
        url,
        events: ["checkout_session.payment.paid", "payment.failed"],
      },
    },
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.errors?.[0]?.detail ?? "Webhook registration failed.");
console.log(`Registered SKED platform subscription webhook: ${result.data.id}`);
