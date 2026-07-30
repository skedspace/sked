import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readPlatformPricingConfig } from "@/lib/pricing-config";
import {
  attachCheckoutSession,
  checkoutAmount,
  createCheckoutRecord,
  newCheckout,
} from "@/lib/platform-subscriptions";
import { createPlatformCheckoutSession } from "@/lib/payments/platform-paymongo";
import { isDevAuthEnabled } from "@/lib/dev-auth";

function requestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = isDevAuthEnabled()
      ? { org_id: "00000000-0000-0000-0000-000000000001", role: "owner" }
      : (await supabase.from("org_members")
          .select("org_id, role").eq("user_id", session.user.id).limit(1).maybeSingle()).data;
    if (!membership?.org_id || membership.role !== "owner") {
      return NextResponse.json({ error: "Only an organization owner can subscribe." }, { status: 403 });
    }

    const body = await request.json() as { termMonths?: number };
    const termMonths = Number(body.termMonths ?? 1);
    const pricing = await readPlatformPricingConfig();
    if (!pricing.allowTrialConversion) {
      return NextResponse.json({ error: "Premium conversion is currently unavailable." }, { status: 409 });
    }
    const amountCents = checkoutAmount(pricing.monthlyPriceCents, termMonths, {
      12: pricing.oneYearDiscount, 24: pricing.twoYearDiscount, 36: pricing.threeYearDiscount,
    });
    const suppliedKey = request.headers.get("idempotency-key")?.trim();
    const key = suppliedKey && suppliedKey.length <= 128
      ? suppliedKey
      : `${membership.org_id}:${termMonths}:${new Date().toISOString().slice(0, 13)}`;
    const record = await createCheckoutRecord(newCheckout({
      orgId: membership.org_id,
      userId: session.user.id,
      termMonths,
      amountCents,
      idempotencyKey: key,
    }));
    if (record.checkout_url) {
      return NextResponse.json({ checkoutId: record.id, checkoutUrl: record.checkout_url });
    }

    const checkout = await createPlatformCheckoutSession({
      checkoutId: record.id,
      amountCents,
      termMonths,
      customerEmail: session.user.email,
      origin: requestOrigin(request),
    });
    const saved = await attachCheckoutSession(record.id, checkout.id, checkout.attributes.checkout_url);
    return NextResponse.json({ checkoutId: saved.id, checkoutUrl: saved.checkout_url });
  } catch (error) {
    console.error("[platform checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be started." },
      { status: 500 },
    );
  }
}
