"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { savePlatformConfig } from "@/lib/platform-config";

type ActionResult = {
  ok: boolean;
  error?: string;
};

const descriptions: Record<string, string> = {
  platform_name: "Public platform name.",
  platform_logo_url: "Platform logo image URL.",
  platform_favicon_url: "Platform favicon image URL.",
  platform_primary_color: "Primary platform brand color.",
  platform_accent_color: "Accent platform brand color.",
  platform_custom_domain: "Primary platform custom domain.",
  platform_timezone: "Default platform timezone.",
  platform_currency: "Default platform currency.",
  platform_language: "Default platform language.",
  platform_date_format: "Default platform date format.",
  platform_number_format: "Default platform number format.",
  platform_maintenance_mode: "Whether platform maintenance mode is enabled.",
  booking_default_duration_minutes: "Default booking duration in minutes.",
  booking_buffer_minutes: "Default buffer and preparation time in minutes.",
  booking_cancellation_hours: "Default cancellation cutoff in hours.",
  booking_interval_minutes: "Default booking interval in minutes.",
  security_two_factor_required: "Whether two-factor authentication is required for admins.",
  security_active_session_limit: "Maximum active sessions per admin user.",
  security_api_key_limit: "Maximum active platform API keys.",
  notifications_email_enabled: "Whether email notifications are enabled.",
  notifications_in_app_enabled: "Whether in-app notifications are enabled.",
  notifications_payment_alerts_enabled: "Whether payment alerts are enabled.",
  notifications_weekly_reports_enabled: "Whether weekly reports are enabled.",
  integration_paymongo_connected: "Whether PayMongo is marked connected.",
  integration_resend_connected: "Whether Resend is marked connected.",
  integration_google_analytics_connected: "Whether Google Analytics is marked connected.",
  integration_facebook_pixel_connected: "Whether Facebook Pixel is marked connected.",
  system_last_cache_clear: "Last platform cache clear timestamp.",
  system_last_queue_restart: "Last queue restart timestamp.",
  system_last_search_rebuild: "Last search index rebuild timestamp.",
  system_last_backup_at: "Last platform backup timestamp.",
};

async function setConfig(key: string, value: string) {
  try {
    const result = await savePlatformConfig(
      key,
      value,
      descriptions[key] ?? "Platform setting.",
    );
    revalidatePath("/admin");
    revalidatePath("/admin/platform-settings");
    return {
      ok: result.persisted,
      error: result.persisted
        ? result.source === "local"
          ? "Saved to the local preview store. Supabase is disconnected."
          : undefined
        : result.error,
      source: result.source,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Setting could not be saved.",
    };
  }
}

export async function updatePlatformSettingAction(key: string, value: string): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };
  if (!/^[a-z0-9_]+$/.test(key)) return { ok: false, error: "Invalid setting key." };
  return setConfig(key, value);
}

export async function runPlatformQuickActionAction(action: "clear_cache" | "restart_queues" | "rebuild_search" | "database_backup"): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };
  const keyByAction = {
    clear_cache: "system_last_cache_clear",
    restart_queues: "system_last_queue_restart",
    rebuild_search: "system_last_search_rebuild",
    database_backup: "system_last_backup_at",
  };
  return setConfig(keyByAction[action], new Date().toISOString());
}
