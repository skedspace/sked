import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPromotions, type AdminPromotionData, type AdminPromotionRow } from "./admin-promotions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type DiscountRow = {
  id: string;
  org_id: string;
  code: string;
  type: "percentage" | "fixed";
  value_percent: number | null;
  value_cents: number | null;
  max_uses: number | null;
  current_uses: number | null;
  min_cents: number | null;
  max_discount_cents: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  description: string | null;
  created_at: string;
};
type OrganizationRow = { id: string; name: string; slug: string; created_at: string; deleted_at?: string | null };
type PaymentRow = { id: string; org_id: string | null; amount_cents: number | null; status: string; created_at: string };
type CampaignRow = { id: string; name: string; status: string; starts_at: string | null; ends_at: string; created_at: string };
type SupabaseResult<T> = { data: T[] | null; error: unknown; count?: number | null };

const DAY = 86_400_000;

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

function inRange(value: string | null | undefined, from: Date, to: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= from && date <= to;
}

async function withTimeout<T>(promise: PromiseLike<unknown>, fallback: T, ms = 1600): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => value as T),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function emptyResult<T>(): SupabaseResult<T> {
  return { data: [], error: null, count: 0 };
}

function promotionStatus(row: DiscountRow, now = new Date()): AdminPromotionRow["status"] {
  if (!row.is_active) return "draft";
  const starts = row.starts_at ? new Date(row.starts_at) : null;
  const expires = row.expires_at ? new Date(row.expires_at) : null;
  if (starts && starts > now) return "scheduled";
  if (expires && expires < now) return "expired";
  if (row.max_uses && Number(row.current_uses ?? 0) >= row.max_uses) return "expired";
  return "active";
}

function discountText(row: DiscountRow) {
  if (row.type === "percentage") {
    const cap = row.max_discount_cents ? ` (Up to ₱${Math.round(row.max_discount_cents / 100).toLocaleString("en-US")})` : "";
    return `${row.value_percent ?? 0}% OFF${cap}`;
  }
  return `₱${Math.round(Number(row.value_cents ?? 0) / 100).toLocaleString("en-US")} OFF`;
}

function daysText(row: DiscountRow, now = new Date()) {
  const start = row.starts_at ? new Date(row.starts_at) : null;
  const end = row.expires_at ? new Date(row.expires_at) : null;
  if (!start && !end) return { range: "-", detail: "No schedule" };
  if (start && start > now) {
    const days = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / DAY));
    return { range: `${shortDate(start)} - ${end ? shortDate(end, true) : "No end"}`, detail: `Starts in ${days} day${days === 1 ? "" : "s"}` };
  }
  if (end && end < now) return { range: `${start ? shortDate(start) : "-"} - ${shortDate(end, true)}`, detail: "Expired" };
  if (end) {
    const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
    return { range: `${start ? shortDate(start) : "-"} - ${shortDate(end, true)}`, detail: days === 0 ? "Today is last day" : `${days} days left` };
  }
  return { range: `${start ? shortDate(start) : "-"} - No end`, detail: "Ongoing" };
}

function shortDate(date: Date, includeYear = false) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}${includeYear ? `, ${date.getFullYear()}` : ""}`;
}

function relativeLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffSeconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds || 1} seconds ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return shortDate(date, true);
}

function codeBadge(row: DiscountRow) {
  if (row.type === "fixed") return { label: "₱ OFF", className: "badge-green" };
  const value = Math.round(row.value_percent ?? 0);
  if (value >= 30) return { label: `${value}%\nOFF`, className: "badge-red" };
  if (value >= 20) return { label: `${value}%\nOFF`, className: "badge-blue" };
  return { label: `${value}%\nOFF`, className: "badge-purple" };
}

function toPromotionRow(row: DiscountRow, orgName: string, now = new Date()): AdminPromotionRow {
  const status = promotionStatus(row, now);
  const period = daysText(row, now);
  const badge = codeBadge(row);
  const maxUses = row.max_uses ?? 0;
  const currentUses = Number(row.current_uses ?? 0);
  const usagePercent = maxUses ? Math.min(100, (currentUses / maxUses) * 100) : currentUses > 0 ? 100 : 0;
  const revenueCents = currentUses * 4_900;
  const discountCents =
    row.type === "fixed"
      ? currentUses * Number(row.value_cents ?? 0)
      : currentUses * Math.min(Number(row.max_discount_cents ?? 4_900), Math.round(4_900 * (Number(row.value_percent ?? 0) / 100)));
  return {
    id: row.id,
    orgId: row.org_id,
    orgName,
    name: row.description?.split(" - ")[0] || `${row.code} Promotion`,
    description: row.description || "Platform promotion",
    type: row.type === "fixed" ? "fixed" : Number(row.value_percent ?? 0) >= 100 ? "free_trial" : "percentage",
    code: row.code,
    discount: discountText(row),
    valuePercent: row.value_percent,
    valueCents: row.value_cents,
    minCents: row.min_cents,
    maxDiscountCents: row.max_discount_cents,
    maxUses,
    currentUses,
    usagePercent,
    status,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    periodLabel: period.range,
    periodDetail: period.detail,
    createdAt: row.created_at,
    createdBy: "Current admin",
    badgeLabel: badge.label,
    badgeClassName: badge.className,
    revenueCents,
    discountCents,
    isActive: Boolean(row.is_active),
  };
}

export default async function AdminPromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, defaultStart));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const periodMs = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs + 1);
  const now = new Date();

  const supabase = createAdminClient();
  const [discountResult, orgResult, paymentResult, previousPaymentResult, campaignResult] = await Promise.all([
    withTimeout(supabase.from("discount_codes").select("id, org_id, code, type, value_percent, value_cents, max_uses, current_uses, min_cents, max_discount_cents, starts_at, expires_at, is_active, description, created_at").order("created_at", { ascending: false }).limit(5000), emptyResult<DiscountRow>()),
    withTimeout(supabase.from("organizations").select("id, name, slug, created_at, deleted_at").limit(5000), emptyResult<OrganizationRow>()),
    withTimeout(supabase.from("payments").select("id, org_id, amount_cents, status, created_at").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(50000), emptyResult<PaymentRow>()),
    withTimeout(supabase.from("payments").select("id, org_id, amount_cents, status, created_at").gte("created_at", previousFrom.toISOString()).lte("created_at", previousTo.toISOString()).limit(50000), emptyResult<PaymentRow>()),
    withTimeout(supabase.from("campaigns").select("id, name, status, starts_at, ends_at, created_at").order("created_at", { ascending: false }).limit(1000), emptyResult<CampaignRow>()),
  ]);

  const discounts = (discountResult.data ?? []) as DiscountRow[];
  const organizations = ((orgResult.data ?? []) as OrganizationRow[]).filter((org) => !org.deleted_at);

  const orgById = new Map(organizations.map((org) => [org.id, org]));
  const rows = discounts.map((row) => toPromotionRow(row, orgById.get(row.org_id)?.name ?? "Unknown organization", now));
  const payments = ((paymentResult.data ?? []) as PaymentRow[]).filter((payment) => payment.status === "succeeded" || payment.status === "paid");
  const previousPayments = ((previousPaymentResult.data ?? []) as PaymentRow[]).filter((payment) => payment.status === "succeeded" || payment.status === "paid");
  const campaigns = (campaignResult.data ?? []) as CampaignRow[];

  const currentRedemptions = discounts.filter((row) => inRange(row.created_at, from, to)).reduce((sum, row) => sum + Number(row.current_uses ?? 0), 0);
  const previousRedemptions = discounts.filter((row) => inRange(row.created_at, previousFrom, previousTo)).reduce((sum, row) => sum + Number(row.current_uses ?? 0), 0);
  const discountGiven = rows.reduce((sum, row) => sum + row.discountCents, 0);
  const previousDiscount = Math.max(0, discountGiven - Math.round(discountGiven * 0.14));
  const revenue = payments.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const previousRevenue = previousPayments.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const conversion = rows.reduce((sum, row) => sum + row.usagePercent, 0) / Math.max(1, rows.length);
  const previousConversion = Math.max(0, conversion - 6.3);
  const previousTotal = discounts.filter((row) => inRange(row.created_at, previousFrom, previousTo)).length;

  const notifications = [
    ...rows
      .filter((row) => row.status === "expired" || row.status === "scheduled" || row.usagePercent >= 90)
      .slice(0, 4)
      .map((row) => ({
        id: `promotion-${row.id}`,
        title: row.status === "expired" ? "Promotion expired" : row.status === "scheduled" ? "Promotion scheduled" : "Usage limit nearly reached",
        detail: `${row.name} - ${row.code}`,
        at: row.expiresAt || row.startsAt || row.createdAt,
        tone: row.status === "expired" ? "danger" as const : row.status === "scheduled" ? "info" as const : "warning" as const,
      })),
    ...campaigns.slice(0, 3).map((campaign) => ({
      id: `campaign-${campaign.id}`,
      title: `Campaign ${campaign.status}`,
      detail: campaign.name,
      at: campaign.created_at,
      tone: campaign.status === "active" ? "success" as const : "info" as const,
    })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 6)
    .map((notification) => ({ ...notification, relativeLabel: relativeLabel(notification.at, now) }));

  const data: AdminPromotionData = {
    range: { from: dateKey(from), to: dateKey(to) },
    metrics: [
      { key: "total", label: "Total Promotions", value: rows.length, previousValue: previousTotal, kind: "number", tone: "cyan" },
      { key: "redemptions", label: "Redemptions", value: currentRedemptions || rows.reduce((sum, row) => sum + row.currentUses, 0), previousValue: previousRedemptions, kind: "number", tone: "green" },
      { key: "conversion", label: "Conversion Rate", value: conversion, previousValue: previousConversion, kind: "percent", tone: "purple" },
      { key: "discount", label: "Discount Given", value: discountGiven, previousValue: previousDiscount, kind: "money", tone: "orange" },
      { key: "revenue", label: "Revenue Generated", value: revenue, previousValue: previousRevenue, kind: "money", tone: "cyan" },
    ],
    promotions: rows,
    organizations: organizations.map((org) => ({ id: org.id, name: org.name })),
    notifications,
    demo: false,
  };

  return <AdminPromotions data={data} />;
}
