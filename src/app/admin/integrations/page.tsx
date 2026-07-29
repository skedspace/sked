import os from "node:os";
import packageJson from "../../../../package.json";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { readPlatformConfig } from "@/lib/platform-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminIntegrations, type IntegrationsData, type IntegrationLog } from "./admin-integrations";
import type { WebhookEndpoint } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PaymentRow = { id: string; status: string; provider: string; created_at: string; amount_cents: number; description: string | null };
type AuditRow = { id: number; action: string; target: string | null; created_at: string; payload: unknown };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function date(value: string | string[] | undefined, fallback: Date, end = false) {
  const parsed = first(value) ? new Date(`${first(value)}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function bool(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function endpoints(value: string | undefined): WebhookEndpoint[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function maskKey(value: string | undefined) {
  if (!value) return "Not configured";
  const prefix = value.slice(0, Math.min(8, value.length));
  return `${prefix}${"*".repeat(6)}${value.slice(-4)}`;
}

function auditDetail(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fallback;
  const record = payload as Record<string, unknown>;
  return typeof record.detail === "string" ? record.detail : typeof record.message === "string" ? record.message : fallback;
}

async function queryLiveData(from: Date, to: Date) {
  if (isDevAuthEnabled()) return { payments: [] as PaymentRow[], audits: [] as AuditRow[] };
  try {
    const supabase = createAdminClient();
    const [payments, audits] = await Promise.all([
      supabase.from("payments").select("id, status, provider, created_at, amount_cents, description")
        .ilike("provider", "%paymongo%").gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("audit_log").select("id, action, target, created_at, payload")
        .or("action.ilike.%integration%,action.ilike.%webhook%,target.ilike.%integration%,target.ilike.%webhook%")
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
        .order("created_at", { ascending: false }).limit(100),
    ]);
    return {
      payments: (payments.data ?? []) as PaymentRow[],
      audits: (audits.data ?? []) as AuditRow[],
    };
  } catch {
    return { payments: [] as PaymentRow[], audits: [] as AuditRow[] };
  }
}

export default async function AdminIntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = date(params.from, monthAgo);
  const rawTo = date(params.to, now, true);
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const configResult = await readPlatformConfig();
  const config = new Map(configResult.rows.map((row) => [row.key, row]));
  const credentialsConfigured = Boolean(process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_PUBLIC_KEY);
  const enabled = bool(config.get("integration_paymongo_enabled")?.value, credentialsConfigured);
  const connected = credentialsConfigured && enabled;
  const endpointRows = endpoints(config.get("platform_webhook_endpoints")?.value);
  const live = await queryLiveData(from, to);

  const paymentLogs: IntegrationLog[] = live.payments.map((payment) => ({
    id: `payment-${payment.id}`,
    event: payment.status === "failed" ? "Payment Failed" : payment.status === "succeeded" || payment.status === "paid" ? "Payment Succeeded" : "Payment Updated",
    source: "PayMongo",
    status: payment.status === "failed" ? "failed" : payment.status === "pending" ? "pending" : "success",
    detail: payment.description || `Platform subscription payment: ${payment.status}`,
    at: payment.created_at,
  }));
  const auditLogs: IntegrationLog[] = live.audits.map((entry) => ({
    id: `audit-${entry.id}`,
    event: entry.action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    source: entry.target || "Platform",
    status: entry.action.toLowerCase().includes("fail") ? "failed" : "success",
    detail: auditDetail(entry.payload, "Platform integration activity"),
    at: entry.created_at,
  }));
  const logs = [...paymentLogs, ...auditLogs].sort((a, b) => b.at.localeCompare(a.at));
  const lastSync = config.get("integration_paymongo_last_sync_at")?.value || logs.find((log) => log.status === "success")?.at || null;
  const memory = process.memoryUsage();

  const data: IntegrationsData = {
    range: { from: dateKey(from), to: dateKey(to) },
    paymongo: {
      configured: credentialsConfigured,
      enabled,
      connected,
      environment: process.env.PAYMONGO_SECRET_KEY?.includes("_live_") ? "Live" : credentialsConfigured ? "Test" : "Not configured",
      credentialId: maskKey(process.env.PAYMONGO_PUBLIC_KEY),
      lastPaymentAt: live.payments[0]?.created_at || null,
      lastSyncAt: lastSync,
    },
    endpoints: endpointRows,
    logs,
    configSource: configResult.source,
    databaseHealthy: configResult.databaseHealthy,
    notifications: logs.slice(0, 6),
    system: {
      environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
      region: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: `v${packageJson.version}`,
      processUptimeSeconds: process.uptime(),
      memoryUsage: (memory.rss / os.totalmem()) * 100,
      transport: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ? "HTTPS" : "Local HTTP",
      lastConfigAt: configResult.rows.map((row) => row.updated_at).filter(Boolean).sort().at(-1) || null,
    },
  };

  return <AdminIntegrations data={data} />;
}
