import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export type CheckoutStatus = "pending" | "paid" | "failed" | "expired" | "canceled";
export type PlatformCheckout = {
  id: string;
  idempotency_key: string;
  org_id: string;
  user_id: string;
  billing_term_months: number;
  amount_cents: number;
  currency: "PHP";
  status: CheckoutStatus;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_id: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type LocalLedger = {
  checkouts: PlatformCheckout[];
  eventIds: string[];
  subscription?: { orgId: string; status: "active"; periodEnd: string; termMonths: number };
};
const ledgerPath = path.join(process.cwd(), ".next", "cache", "platform-subscriptions.json");

async function readLedger(): Promise<LocalLedger> {
  try {
    return JSON.parse(await readFile(ledgerPath, "utf8")) as LocalLedger;
  } catch {
    return { checkouts: [], eventIds: [] };
  }
}
async function writeLedger(ledger: LocalLedger) {
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
}
export function checkoutAmount(monthlyCents: number, months: number, discounts: Record<number, number>) {
  if (![1, 12, 24, 36].includes(months)) throw new Error("Unsupported billing term.");
  const discount = months === 1 ? 0 : discounts[months] ?? 0;
  return Math.round(monthlyCents * months * (1 - discount / 100));
}
export function newCheckout(input: {
  orgId: string; userId: string; termMonths: number; amountCents: number; idempotencyKey: string;
}): PlatformCheckout {
  const now = new Date().toISOString();
  return {
    id: randomUUID(), idempotency_key: input.idempotencyKey, org_id: input.orgId,
    user_id: input.userId, billing_term_months: input.termMonths,
    amount_cents: input.amountCents, currency: "PHP", status: "pending",
    paymongo_checkout_session_id: null, paymongo_payment_id: null,
    checkout_url: null, paid_at: null, created_at: now, updated_at: now,
  };
}
export async function createCheckoutRecord(record: PlatformCheckout) {
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    const existing = ledger.checkouts.find((item) => item.idempotency_key === record.idempotency_key);
    if (existing) return existing;
    ledger.checkouts.push(record);
    await writeLedger(ledger);
    return record;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_subscription_checkouts")
    .insert(record).select("*").single();
  if (error) {
    const { data: existing } = await admin.from("platform_subscription_checkouts")
      .select("*").eq("idempotency_key", record.idempotency_key).single();
    if (existing) return existing as PlatformCheckout;
    throw error;
  }
  return data as PlatformCheckout;
}
export async function attachCheckoutSession(id: string, sessionId: string, checkoutUrl: string) {
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    const row = ledger.checkouts.find((item) => item.id === id);
    if (!row) throw new Error("Checkout record not found.");
    row.paymongo_checkout_session_id = sessionId;
    row.checkout_url = checkoutUrl;
    row.updated_at = new Date().toISOString();
    await writeLedger(ledger);
    return row;
  }
  const { data, error } = await createAdminClient().from("platform_subscription_checkouts")
    .update({ paymongo_checkout_session_id: sessionId, checkout_url: checkoutUrl })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data as PlatformCheckout;
}
export async function getCheckout(id: string, orgId?: string) {
  if (isDevAuthEnabled()) {
    const row = (await readLedger()).checkouts.find((item) => item.id === id);
    return row && (!orgId || row.org_id === orgId) ? row : null;
  }
  let query = createAdminClient().from("platform_subscription_checkouts").select("*").eq("id", id);
  if (orgId) query = query.eq("org_id", orgId);
  const { data } = await query.maybeSingle();
  return data as PlatformCheckout | null;
}
export async function reserveWebhookEvent(eventId: string, type: string, livemode: boolean, raw: string) {
  const hash = createHash("sha256").update(raw).digest("hex");
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    if (ledger.eventIds.includes(eventId)) return false;
    ledger.eventIds.push(eventId);
    await writeLedger(ledger);
    return true;
  }
  const { error } = await createAdminClient().from("platform_subscription_webhook_events")
    .insert({ event_id: eventId, event_type: type, livemode, payload_hash: hash });
  return !error;
}
export async function finishWebhookEvent(eventId: string, status: "processed" | "ignored") {
  if (isDevAuthEnabled()) return;
  await createAdminClient().from("platform_subscription_webhook_events")
    .update({ status, processed_at: new Date().toISOString(), error: null }).eq("event_id", eventId);
}
export async function releaseWebhookEvent(eventId: string, error: unknown) {
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    ledger.eventIds = ledger.eventIds.filter((id) => id !== eventId);
    await writeLedger(ledger);
    return;
  }
  await createAdminClient().from("platform_subscription_webhook_events")
    .delete().eq("event_id", eventId);
  console.error("[platform webhook retryable failure]", error);
}
export async function markCheckout(id: string, status: Exclude<CheckoutStatus, "paid">) {
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    const row = ledger.checkouts.find((item) => item.id === id);
    if (row && row.status !== "paid") row.status = status;
    await writeLedger(ledger);
    return;
  }
  const admin = createAdminClient();
  const { data: checkout } = await admin.from("platform_subscription_checkouts")
    .select("org_id, user_id, amount_cents").eq("id", id).single();
  await admin.from("platform_subscription_checkouts")
    .update({ status }).eq("id", id).neq("status", "paid");
  if (checkout) {
    await admin.from("audit_log").insert({
      org_id: checkout.org_id,
      actor_id: checkout.user_id,
      action: `subscription.payment_${status}`,
      target: id,
      payload: { checkout_id: id, amount_cents: checkout.amount_cents },
    });
  }
}
export async function activateCheckout(id: string, paymentId: string, paidAt: string) {
  if (isDevAuthEnabled()) {
    const ledger = await readLedger();
    const row = ledger.checkouts.find((item) => item.id === id);
    if (!row) throw new Error("Checkout record not found.");
    if (row.status !== "paid") {
      row.status = "paid"; row.paymongo_payment_id = paymentId; row.paid_at = paidAt;
      const start = ledger.subscription?.status === "active" &&
        new Date(ledger.subscription.periodEnd) > new Date()
        ? new Date(ledger.subscription.periodEnd) : new Date();
      start.setUTCMonth(start.getUTCMonth() + row.billing_term_months);
      ledger.subscription = { orgId: row.org_id, status: "active", periodEnd: start.toISOString(), termMonths: row.billing_term_months };
      await writeLedger(ledger);
    }
    return;
  }
  const { error } = await createAdminClient().rpc("activate_platform_subscription", {
    p_checkout_id: id, p_payment_id: paymentId, p_paid_at: paidAt,
  });
  if (error) throw error;
}
