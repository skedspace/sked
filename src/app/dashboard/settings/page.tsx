import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  business_type: "Pickleball Club",
  website: "",
  address: "",
  google_review_url: "",
  primary_color: "#22C55E",
  accent_color: "#0F172A",
  booking_window_days: 7,
  minimum_notice_minutes: 60,
  cancellation_notice_hours: 24,
  booking_interval_minutes: 30,
  overlapping_bookings: false,
  auto_confirmation: true,
  language: "English",
  date_format: "MMM d, yyyy",
  time_format: "12-hour (AM/PM)",
  currency: "PHP (₱)",
  number_format: "1,234.56",
  timezone: "Asia/Manila",
  default_homepage: "Dashboard",
  default_tab: "Calendar",
  items_per_page: 20,
  dark_mode: false,
  compact_view: false,
  notification_preferences: {
    booking_created: true,
    booking_cancelled: true,
    payment_received: true,
    daily_digest: true,
    marketing: false,
    email: true,
    sms: false,
    push: true,
  },
  payment_methods: [],
  integration_settings: {
    google_calendar: false,
    outlook_calendar: false,
    stripe: false,
    gcash: false,
    webhooks: false,
    public_api: false,
  },
  security_settings: {
    two_factor: false,
    session_timeout_minutes: 120,
    staff_can_export: false,
    require_strong_passwords: true,
    login_alerts: true,
  },
  role_settings: {
    staff_can_manage_bookings: true,
    staff_can_manage_customers: false,
    staff_can_view_reports: false,
    staff_can_manage_payments: false,
  },
};

export default async function SettingsPage() {
  const supabase = createClient();
  const db = supabase as any;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .single();

  if (!membership) redirect("/onboarding");

  const [
    orgResult,
    settingsResult,
    membersResult,
    invitationsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, logo_url, contact_email, contact_phone")
      .eq("id", membership.org_id)
      .single(),
    db
      .from("org_settings")
      .select("*")
      .eq("org_id", membership.org_id)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("user_id, role, created_at")
      .eq("org_id", membership.org_id),
    db
      .from("staff_invitations")
      .select("id, email, role, expires_at, accepted_at, created_at")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false }),
    db
      .from("subscriptions")
      .select("id, plan, status, current_period_end")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // These columns are nullable TEXT. A spread lets a stored null overwrite the
  // "" defaults above, and settings-view's saveChanges() then calls .trim() on
  // it — so an org that saved once with the field blank could not save again.
  const storedSettings = (settingsResult.error ? null : settingsResult.data) ?? {};
  const mergedSettings: Record<string, unknown> = {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
  };
  for (const key of ["website", "address", "google_review_url"]) {
    mergedSettings[key] ??= "";
  }

  return (
    <SettingsView
      orgId={membership.org_id}
      userEmail={session.user.email ?? ""}
      currentUserId={session.user.id}
      isOwner={membership.role === "owner"}
      organization={(orgResult.data ?? {}) as any}
      settings={mergedSettings as any}
      members={(membersResult.data ?? []) as any[]}
      invitations={
        (invitationsResult.error ? [] : (invitationsResult.data ?? [])) as any[]
      }
      subscription={
        (subscriptionsResult.error
          ? null
          : subscriptionsResult.data?.[0]) as any
      }
      settingsSchemaReady={!settingsResult.error}
    />
  );
}
