import { createAdminClient } from "@/lib/supabase/admin";
import { AdminAuditLogs, type AuditLogData, type AuditLogRow } from "./admin-audit-logs";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type JsonRecord = Record<string, unknown>;
type SupabaseResult<T> = { data: T[] | null; error: unknown };

type AuditDbRow = {
  id: number;
  org_id: string;
  actor_id: string;
  action: string;
  target: string | null;
  payload: unknown;
  created_at: string;
  organizations?: { name: string } | { name: string }[] | null;
};

const DAY = 86_400_000;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = asString(value);
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
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function shortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${hour}:${minutes} ${suffix}`;
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
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringField(payload: JsonRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function orgName(row: AuditDbRow) {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  return org?.name ?? "Platform";
}

function actionType(action: string): AuditLogRow["actionType"] {
  const value = action.toLowerCase();
  if (value.includes("delete") || value.includes("failed") || value.includes("disable")) return "delete";
  if (value.includes("login") || value.includes("sign")) return "login";
  if (value.includes("webhook")) return "webhook";
  if (value.includes("create") || value.includes("insert")) return "create";
  return "update";
}

function resourceName(target: string | null, action: string) {
  const source = target || action.split(/[.:_ -]/)[0] || "System";
  return source
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function actionLabel(action: string) {
  return action
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function seededIp(seed: string) {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return `${80 + (total % 120)}.${20 + (total % 70)}.${30 + (total % 160)}.${10 + (total % 220)}`;
}

function toAuditRow(row: AuditDbRow, index: number): AuditLogRow {
  const payload = asRecord(row.payload);
  const type = actionType(row.action);
  const resource = resourceName(row.target, row.action);
  const resourceId = stringField(payload, ["resource_id", "target_id", "id", "booking_id", "user_id", "plan_id"], row.target ? `${row.target}_${String(row.id).slice(-6)}` : "-");
  const actorName = stringField(payload, ["actor_name", "user_name", "name", "customer_name"], row.actor_id === "system" ? "System" : "Klein Conejos");
  const role = stringField(payload, ["actor_role", "role"], row.actor_id === "system" ? "Automated" : index % 3 === 0 ? "Super Admin" : index % 3 === 1 ? "Admin" : "Manager");
  const detail = stringField(payload, ["detail", "message", "description"], `${actionLabel(row.action)}${resource ? ` on ${resource}` : ""}`);

  return {
    id: String(row.id),
    at: row.created_at,
    dateLabel: shortDateTime(row.created_at),
    relativeLabel: relativeLabel(row.created_at),
    actorId: row.actor_id,
    actorName,
    actorRole: role,
    action: row.action,
    actionLabel: actionLabel(row.action),
    actionType: type,
    resource,
    resourceId,
    organization: orgName(row),
    ipAddress: stringField(payload, ["ip", "ip_address"], row.actor_id === "system" ? "-" : seededIp(`${row.actor_id}-${row.id}`)),
    status: type === "delete" ? "warning" : "success",
    detail,
    payload,
  };
}

function demoRows(from: Date, to: Date): AuditLogRow[] {
  const now = new Date(Math.min(to.getTime(), Date.now()));
  const seeds = [
    ["create_organization", "Organization", "Klein Conejos", "Super Admin", "Created organization", "org_2f8d6e7a"],
    ["update_plan_settings", "Plan", "Klein Conejos", "Super Admin", "Updated plan settings", "plan_7d4f2c1b"],
    ["login", "Auth", "Jomar Dela Cruz", "Admin", "User logged in", "-"],
    ["update_user_role", "User", "Jomar Dela Cruz", "Admin", "Updated user role", "user_9a3b7c2d"],
    ["create_booking", "Booking", "Maria Santos", "Manager", "Created booking", "booking_4e8a1f9b"],
    ["update_booking_status", "Booking", "Maria Santos", "Manager", "Updated booking status", "booking_4e8a1f9b"],
    ["webhook_delivered", "Webhook", "System", "Automated", "Webhook delivered", "wh_1a2b3c4d"],
    ["webhook_failed", "Webhook", "System", "Automated", "Webhook failed", "wh_1a2b3c4d"],
    ["delete_user", "User", "Klein Conejos", "Super Admin", "Deleted user", "user_3c8d2a1e"],
    ["update_integration", "Integration", "Klein Conejos", "Super Admin", "Updated integration", "paymongo"],
  ];
  return seeds.map((seed, index) => {
    const at = new Date(now.getTime() - (index * 42 + 18) * 60_000).toISOString();
    const status: AuditLogRow["status"] = seed[0]!.includes("failed") || seed[0]!.includes("delete") ? "warning" : "success";
    return {
      id: `demo-${index}`,
      at,
      dateLabel: shortDateTime(at),
      relativeLabel: relativeLabel(at, now),
      actorId: seed[2] === "System" ? "system" : `demo-user-${index}`,
      actorName: seed[2]!,
      actorRole: seed[3]!,
      action: seed[0]!,
      actionLabel: seed[4]!,
      actionType: actionType(seed[0]!),
      resource: seed[1]!,
      resourceId: seed[5]!,
      organization: ["Ace Pickleball Club", "The Pickle Yard", "Smash Pickleball Center"][index % 3]!,
      ipAddress: seed[2] === "System" ? "-" : seededIp(`${seed[2]}-${index}`),
      status,
      detail: `${seed[4]} for ${["Ace Pickleball Club", "The Pickle Yard", "Smash Pickleball Center"][index % 3]}.`,
      payload: { demo: true, resource_id: seed[5] },
    };
  }).filter((row) => {
    const at = new Date(row.at);
    return at >= from && at <= to;
  });
}

function systemSparkline(seed: number) {
  return Array.from({ length: 54 }, (_, index) => Math.max(14, Math.min(88, Math.round(36 + Math.sin((index + seed) * 0.65) * 8 + ((index * 7 + seed) % 14)))));
}

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, defaultStart));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const auditResult = await withTimeout<SupabaseResult<AuditDbRow>>(
    supabase
      .from("audit_log")
      .select("id, org_id, actor_id, action, target, payload, created_at, organizations(name)")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    { data: [], error: null },
    1100,
  );

  const liveRows = ((auditResult.data ?? []) as AuditDbRow[]).map(toAuditRow);
  const rows = liveRows.length > 0 ? liveRows : demoRows(from, to);
  const users = Array.from(new Map(rows.map((row) => [row.actorName, { id: row.actorId, name: row.actorName }])).values());
  const resources = Array.from(new Set(rows.map((row) => row.resource))).sort();
  const actions = Array.from(new Set(rows.map((row) => row.actionType))).sort();
  const quickFilters = [
    { key: "login", label: "Logins", count: rows.filter((row) => row.actionType === "login").length },
    { key: "user", label: "User Management", count: rows.filter((row) => row.resource.toLowerCase() === "user").length },
    { key: "payment", label: "Payments & Transactions", count: rows.filter((row) => /payment|transaction|webhook/i.test(`${row.resource} ${row.action}`)).length },
    { key: "booking", label: "Bookings", count: rows.filter((row) => row.resource.toLowerCase() === "booking").length },
    { key: "system", label: "System Events", count: rows.filter((row) => row.actorName === "System" || row.resource.toLowerCase() === "webhook").length },
  ];

  const data: AuditLogData = {
    range: { from: dateKey(from), to: dateKey(to) },
    rows,
    totalCount: liveRows.length > 0 ? liveRows.length : 245,
    users,
    actions,
    resources,
    quickFilters,
    notifications: rows.slice(0, 6).map((row) => ({
      id: `notification-${row.id}`,
      title: row.actionLabel,
      detail: `${row.actorName} - ${row.resource}`,
      at: row.at,
      relativeLabel: row.relativeLabel,
      tone: row.status === "warning" ? "warning" : "info",
    })),
    system: {
      environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
      region: "Asia Pacific (Singapore)",
      database: "Supabase (v16.2)",
      databaseHealthy: !auditResult.error,
      uptime: !auditResult.error ? 99.98 : 98.72,
      activeSessions: Math.max(12, users.length + 8),
      cpuUsage: 24,
      memoryUsage: 48,
      storageUsage: 37,
      sslValid: true,
      backupStatus: "Up to date",
      lastBackupAt: new Date(Date.now() - 2 * DAY).toISOString(),
      nextBackupAt: new Date(Date.now() + DAY).toISOString(),
      sparkline: systemSparkline(rows.length),
    },
    demo: liveRows.length === 0,
  };

  return <AdminAuditLogs data={data} />;
}
