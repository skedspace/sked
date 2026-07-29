import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminPaymentList,
  type AdminPaymentListData,
  type AdminPaymentRow,
  type PaymentStatus,
} from "./admin-payment-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PaymentRow = {
  id: string;
  booking_id: string | null;
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
  updated_at: string;
  booking?: { org_id: string; created_at: string } | { org_id: string; created_at: string }[] | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type SubscriptionRow = {
  org_id: string;
  plan: string;
  status: string;
  created_at: string;
};

type LocationRow = {
  org_id: string;
  name: string;
  address: string | null;
};

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = Array.isArray(value) ? value[0] : value;
  const date = raw ? new Date(`${raw}T00:00:00`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function percent(value: number, total: number) {
  if (total <= 0) return "0.0% of total";
  return `${((value / total) * 100).toFixed(1)}% of total`;
}

function bookingOrg(payment: PaymentRow) {
  if (payment.org_id) return payment.org_id;
  const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
  return booking?.org_id || "";
}

function paymentMethod(payment: PaymentRow, index: number) {
  const saved = payment.payment_method?.trim();
  if (saved) return saved;
  const provider = payment.provider.toLowerCase();
  if (provider.includes("gcash")) return "GCash";
  if (provider.includes("maya")) return "Maya";
  if (provider.includes("master")) return "Mastercard **** 8888";
  if (provider.includes("visa") || provider.includes("stripe")) return `Visa **** ${index % 3 === 0 ? "4242" : "1234"}`;
  return payment.provider || "Manual";
}

function planLabel(subscription: SubscriptionRow | undefined) {
  if (!subscription) return "Premium Monthly";
  return subscription.plan === "trial" ? "Free Trial" : "Premium Monthly";
}

function normalizeStatus(status: string): PaymentStatus {
  if (status === "succeeded" || status === "paid") return "success";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";
  return "pending";
}

function mockData(from: Date, to: Date): AdminPaymentListData {
  const baseline = new Date(Math.min(Date.now(), to.getTime()));
  const at = (days: number, hour: number, minute: number) => {
    const value = new Date(baseline);
    value.setDate(value.getDate() - days);
    value.setHours(hour, minute, 0, 0);
    return value.toISOString();
  };
  const rows: AdminPaymentRow[] = [
    ["INV-20260728-001", "txn_lR3hK2L9e44", "Ace Pickleball Club", "Makati City, PH", "payment", "Premium Monthly", 4900, "Visa **** 4242", "success", at(0, 10, 24), 0],
    ["INV-20260727-002", "txn_lR3gJ8K7p2", "The Pickle Yard", "Cebu City, PH", "payment", "Premium Monthly", 4900, "Mastercard **** 8888", "success", at(1, 20, 41), 1],
    ["INV-20260727-003", "txn_lR3gF6H4q9", "Smash Pickleball Center", "Taguig City, PH", "payment", "Premium Monthly", 4900, "GCash", "success", at(1, 14, 19), 2],
    ["INV-20260726-004", "txn_lR3fC9M8l1", "Rally Point Pickleball", "Davao City, PH", "payment", "Premium Monthly", 4900, "Maya", "pending", at(2, 11, 5), 3],
    ["INV-20260725-005", "txn_lR3eD5J3h7", "Pickle Hub", "Quezon City, PH", "payment", "Premium Monthly", 4900, "Visa **** 1234", "failed", at(3, 9, 32), 4],
    ["INV-20260724-006", "txn_lR3dC6N2k8", "Bay Pickleball Club", "Iloilo City, PH", "payment", "Premium Monthly", 4900, "GCash", "success", at(4, 19, 15), 5],
    ["REF-20260723-001", "ref_lR3cB9Fw2", "CourtSide PH", "Bacolod City, PH", "refund", "Premium Monthly", -4900, "Visa **** 4242", "refunded", at(5, 16, 10), 6],
    ["INV-20260722-007", "txn_lR3bA3R1y6", "Summit Pickleball", "Baguio City, PH", "payment", "Premium Monthly", 4900, "Mastercard **** 5555", "success", at(6, 18, 48), 7],
  ].map((item) => ({
    id: `mock-${item[0]}`,
    invoiceId: String(item[0]),
    transactionId: String(item[1]),
    orgId: `mock-org-${item[10]}`,
    orgSlug: String(item[2]).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    orgName: String(item[2]),
    orgLocation: String(item[3]),
    orgLogoUrl: null,
    type: item[4] as AdminPaymentRow["type"],
    subscription: String(item[5]),
    amountCents: Number(item[6]),
    method: String(item[7]),
    status: item[8] as PaymentStatus,
    paidAt: String(item[9]),
    description: item[4] === "refund" ? "Manual refund" : "Subscription payment",
  }));

  return {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: 152,
    metrics: [
      { key: "total", label: "Total Payments", value: 54829000, change: 0, money: true, tone: "green" },
      { key: "success", label: "Successful Payments", value: 51249000, change: 0, detail: "93.5% of total", money: true, tone: "cyan" },
      { key: "pending", label: "Pending Payments", value: 1560000, change: 0, detail: "2.8% of total", money: true, tone: "orange" },
      { key: "failed", label: "Failed Payments", value: 2020000, change: 0, detail: "3.7% of total", money: true, tone: "red" },
      { key: "refunds", label: "Refunds Issued", value: 800000, change: 0, detail: "5 transactions", money: true, tone: "purple" },
    ],
    payments: rows,
    notifications: [
      { id: "n1", title: "Payment succeeded", detail: "Ace Pickleball Club paid Premium Monthly", at: at(0, 10, 24) },
      { id: "n2", title: "Payment pending", detail: "Rally Point Pickleball via Maya", at: at(2, 11, 5) },
      { id: "n3", title: "Payment failed", detail: "Pickle Hub requires follow-up", at: at(3, 9, 32) },
      { id: "n4", title: "Refund issued", detail: "CourtSide PH refund processed", at: at(5, 16, 10) },
      { id: "n5", title: "GCash payment received", detail: "Bay Pickleball Club payment settled", at: at(4, 19, 15) },
      { id: "n6", title: "Card payment received", detail: "The Pickle Yard payment settled", at: at(1, 20, 41) },
    ],
    demo: true,
  };
}

export default async function AdminPayments({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, monthAgo));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const [paymentsResult, orgResult, locationsResult, subscriptionsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, booking_id, org_id, provider, provider_ref, type, category, payment_method, description, amount_cents, status, created_at, updated_at, booking:bookings(org_id, created_at)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("organizations").select("id, name, slug, logo_url").limit(5000),
    supabase.from("locations").select("org_id, name, address").limit(5000),
    supabase.from("subscriptions").select("org_id, plan, status, created_at").order("created_at", { ascending: false }).limit(10000),
  ]);

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  if (payments.length === 0) return <AdminPaymentList data={mockData(from, to)} />;

  const orgById = new Map(((orgResult.data ?? []) as OrganizationRow[]).map((org) => [org.id, org]));
  const locationByOrg = new Map<string, LocationRow>();
  ((locationsResult.data ?? []) as LocationRow[]).forEach((location) => {
    if (!locationByOrg.has(location.org_id)) locationByOrg.set(location.org_id, location);
  });
  const subscriptionByOrg = new Map<string, SubscriptionRow>();
  ((subscriptionsResult.data ?? []) as SubscriptionRow[]).forEach((subscription) => {
    if (!subscriptionByOrg.has(subscription.org_id)) subscriptionByOrg.set(subscription.org_id, subscription);
  });

  const rows: AdminPaymentRow[] = payments.map((payment, index) => {
    const orgId = bookingOrg(payment);
    const organization = orgById.get(orgId);
    const location = locationByOrg.get(orgId);
    const category = payment.category || (payment.type === "refund" ? "refund" : "booking");
    return {
      id: payment.id,
      invoiceId: `${category === "refund" ? "REF" : "INV"}-${payment.created_at.slice(0, 10).replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`,
      transactionId: payment.provider_ref,
      orgId,
      orgSlug: organization?.slug || orgId,
      orgName: organization?.name || "Unknown organization",
      orgLocation: location?.address || location?.name || "Location not set",
      orgLogoUrl: organization?.logo_url || null,
      type: category === "refund" || payment.type === "refund" ? "refund" : "payment",
      subscription: planLabel(subscriptionByOrg.get(orgId)),
      amountCents:
        category === "refund" || payment.type === "refund"
          ? -Math.abs(Number(payment.amount_cents))
          : Number(payment.amount_cents),
      method: paymentMethod(payment, index),
      status: normalizeStatus(payment.status),
      paidAt: payment.created_at,
      description: payment.description || (category === "refund" ? "Manual refund" : "Subscription payment"),
    };
  });

  const sum = (predicate: (row: AdminPaymentRow) => boolean) =>
    rows.filter(predicate).reduce((total, row) => total + Math.abs(row.amountCents), 0);
  const totalVolume = sum((row) => row.status !== "refunded");
  const successful = sum((row) => row.status === "success");
  const pending = sum((row) => row.status === "pending");
  const failed = sum((row) => row.status === "failed");
  const refunds = sum((row) => row.status === "refunded");
  const refundCount = rows.filter((row) => row.status === "refunded").length;

  const notifications = rows
    .filter((row) => row.status === "failed" || row.status === "pending" || row.status === "refunded" || row.status === "success")
    .slice(0, 6)
    .map((row) => ({
      id: `payment-${row.id}`,
      title:
        row.status === "failed"
          ? "Payment failed"
          : row.status === "pending"
            ? "Payment pending"
            : row.status === "refunded"
              ? "Refund issued"
              : "Payment succeeded",
      detail: `${row.orgName} - ${moneyText(row.amountCents)}`,
      at: row.paidAt,
    }));

  const data: AdminPaymentListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    metrics: [
      { key: "total", label: "Total Payments", value: totalVolume, change: 0, money: true, tone: "green" },
      { key: "success", label: "Successful Payments", value: successful, change: 0, detail: percent(successful, totalVolume), money: true, tone: "cyan" },
      { key: "pending", label: "Pending Payments", value: pending, change: 0, detail: percent(pending, totalVolume), money: true, tone: "orange" },
      { key: "failed", label: "Failed Payments", value: failed, change: 0, detail: percent(failed, totalVolume), money: true, tone: "red" },
      { key: "refunds", label: "Refunds Issued", value: refunds, change: 0, detail: `${refundCount} transactions`, money: true, tone: "purple" },
    ],
    payments: rows,
    notifications,
    demo: false,
  };

  return <AdminPaymentList data={data} />;
}

function moneyText(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}
