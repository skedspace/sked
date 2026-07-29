import os from "node:os";
import packageJson from "../../../../package.json";
import { readPlatformConfig, type PlatformConfigRow } from "@/lib/platform-config";
import { AdminPlatformSettings, type PlatformSettingsData } from "./platform-settings";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ConfigRow = PlatformConfigRow;

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

function configMap(rows: ConfigRow[]) {
  return new Map(rows.map((row) => [row.key, row]));
}

function setting(config: Map<string, ConfigRow>, key: string, fallback: string) {
  return config.get(key)?.value ?? fallback;
}

function boolSetting(config: Map<string, ConfigRow>, key: string, fallback: boolean) {
  const value = config.get(key)?.value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function numberSetting(config: Map<string, ConfigRow>, key: string, fallback: number) {
  const value = Number(config.get(key)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function relativeLabel(value: string | null | undefined, now = new Date()) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  const diffSeconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds || 1} seconds ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

export default async function AdminPlatformSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, defaultStart));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const now = new Date();

  const configResult = await readPlatformConfig();
  const config = configMap(configResult.rows);
  const systemHealthy = configResult.databaseHealthy;
  const lastUpdated = [...config.values()].map((row) => row.updated_at).filter(Boolean).sort().at(-1) ?? now.toISOString();
  const lastBackup = setting(config, "system_last_backup_at", new Date(now.getTime() - 2 * 86_400_000).toISOString());
  const memoryUsage = process.memoryUsage();
  const memoryPercent = Math.min(100, (memoryUsage.rss / os.totalmem()) * 100);
  const processUptime = process.uptime();

  const data: PlatformSettingsData = {
    range: { from: dateKey(from), to: dateKey(to) },
    settings: {
      platformName: setting(config, "platform_name", "SKED"),
      platformLogoUrl: setting(config, "platform_logo_url", ""),
      platformFaviconUrl: setting(config, "platform_favicon_url", ""),
      platformPrimaryColor: setting(config, "platform_primary_color", "#11dce4"),
      platformAccentColor: setting(config, "platform_accent_color", "#72c914"),
      platformCustomDomain: setting(config, "platform_custom_domain", ""),
      language: setting(config, "platform_language", "English"),
      timezone: setting(config, "platform_timezone", "Asia/Singapore"),
      currency: setting(config, "platform_currency", "PHP"),
      dateFormat: setting(config, "platform_date_format", "MMM d, yyyy"),
      numberFormat: setting(config, "platform_number_format", "1,234.56"),
      maintenanceMode: boolSetting(config, "platform_maintenance_mode", false),
      bookingDefaultDurationMinutes: numberSetting(config, "booking_default_duration_minutes", 60),
      bookingBufferMinutes: numberSetting(config, "booking_buffer_minutes", 15),
      bookingCancellationHours: numberSetting(config, "booking_cancellation_hours", 24),
      bookingIntervalMinutes: numberSetting(config, "booking_interval_minutes", 30),
      twoFactorRequired: boolSetting(config, "security_two_factor_required", true),
      activeSessionLimit: numberSetting(config, "security_active_session_limit", 12),
      apiKeyLimit: numberSetting(config, "security_api_key_limit", 8),
      emailNotifications: boolSetting(config, "notifications_email_enabled", true),
      inAppNotifications: boolSetting(config, "notifications_in_app_enabled", true),
      paymentAlerts: boolSetting(config, "notifications_payment_alerts_enabled", true),
      weeklyReports: boolSetting(config, "notifications_weekly_reports_enabled", true),
      paymongoConnected: boolSetting(config, "integration_paymongo_connected", true),
      resendConnected: boolSetting(config, "integration_resend_connected", true),
      googleAnalyticsConnected: boolSetting(config, "integration_google_analytics_connected", true),
      facebookPixelConnected: boolSetting(config, "integration_facebook_pixel_connected", false),
    },
    system: {
      environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
      region: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: `v${packageJson.version}`,
      database: configResult.databaseHealthy ? "Supabase" : "Supabase disconnected",
      databaseHealthy: configResult.databaseHealthy,
      configSource: configResult.source,
      processUptimeLabel: formatUptime(processUptime),
      activeSessions: null,
      errorRate: null,
      cpuUsage: null,
      memoryUsage: memoryPercent,
      storageUsage: null,
      sslValid: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
      backupStatus: config.get("system_last_backup_at") ? "Recorded" : "Not configured",
      lastUpdatedAt: lastUpdated,
      lastUpdatedLabel: relativeLabel(lastUpdated, now),
      lastBackupAt: lastBackup,
      lastBackupLabel: relativeLabel(lastBackup, now),
      nextBackupAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    },
    notifications: [
      { id: "status", title: systemHealthy ? "Database connected" : "Database disconnected", detail: systemHealthy ? "Platform configuration is using Supabase." : "Local preview settings are active until Supabase starts.", at: now.toISOString(), relativeLabel: "Just now", tone: systemHealthy ? "success" as const : "warning" as const },
      { id: "backup", title: "Backup status", detail: `Last backup ${relativeLabel(lastBackup, now)}.`, at: lastBackup, relativeLabel: relativeLabel(lastBackup, now), tone: "info" as const },
      { id: "config", title: "Configuration snapshot", detail: `${configResult.rows.length} platform settings loaded from ${configResult.source}.`, at: lastUpdated, relativeLabel: relativeLabel(lastUpdated, now), tone: "info" as const },
    ].slice(0, 6),
    demo: configResult.source === "local",
  };

  return <AdminPlatformSettings data={data} />;
}
