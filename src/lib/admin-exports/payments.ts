import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  org_id: string | null;
  provider: string;
  provider_ref: string;
  type: string;
  category: string | null;
  payment_method: string | null;
  description: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  booking?: { org_id: string } | { org_id: string }[] | null;
};

function date(value: string | null, fallback: Date, end = false) {
  const parsed = value ? new Date(`${value}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

function key(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function bookingOrg(payment: PaymentRow) {
  if (payment.org_id) return payment.org_id;
  const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
  return booking?.org_id || "";
}

function method(payment: PaymentRow) {
  if (payment.payment_method) return payment.payment_method;
  return payment.provider || "Manual";
}

export async function GET(request: NextRequest) {
  const denied = await superAdminRouteGuard();
  if (denied) return denied;

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const from = date(request.nextUrl.searchParams.get("from"), monthAgo);
  const to = date(request.nextUrl.searchParams.get("to"), today, true);
  const supabase = createAdminClient();

  const [paymentsResult, orgResult, subscriptionResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, org_id, provider, provider_ref, type, category, payment_method, description, amount_cents, status, created_at, booking:bookings(org_id)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000),
    supabase.from("organizations").select("id, name, slug").limit(5000),
    supabase.from("subscriptions").select("org_id, plan, status, created_at").order("created_at", { ascending: false }).limit(10000),
  ]);

  const orgById = new Map((orgResult.data ?? []).map((org) => [org.id, org]));
  const subByOrg = new Map<string, { plan: string; status: string }>();
  (subscriptionResult.data ?? []).forEach((subscription) => {
    if (!subByOrg.has(subscription.org_id)) subByOrg.set(subscription.org_id, subscription);
  });

  const rows = [
    ["payment_id", "invoice_id", "transaction_id", "organization", "organization_slug", "type", "subscription", "amount_cents", "payment_method", "status", "paid_at", "description"],
    ...((paymentsResult.data ?? []) as PaymentRow[]).map((payment, index) => {
      const orgId = bookingOrg(payment);
      const org = orgById.get(orgId);
      const category = payment.category || (payment.type === "refund" ? "refund" : "payment");
      const subscription = subByOrg.get(orgId);
      const invoice = `${category === "refund" ? "REF" : "INV"}-${payment.created_at.slice(0, 10).replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`;
      return [
        payment.id,
        invoice,
        payment.provider_ref,
        org?.name || "",
        org?.slug || "",
        category,
        subscription?.plan === "trial" ? "Free Trial" : "Premium Monthly",
        category === "refund" || payment.type === "refund" ? -Math.abs(payment.amount_cents) : payment.amount_cents,
        method(payment),
        payment.status,
        payment.created_at,
        payment.description || "",
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-payments-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
