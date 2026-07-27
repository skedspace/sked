/**
 * Google Calendar Sync utilities.
 *
 * This module provides the server-side functions for syncing
 * SKED bookings with Google Calendar.
 *
 * Prerequisites:
 *   GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars must be set
 *   from a Google Cloud project with Calendar API enabled.
 */

import { createClient } from "@/lib/supabase/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GCAL_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/**
 * Returns the Google OAuth URL for connecting a calendar.
 */
export function getGoogleAuthUrl(orgId: string, redirectUrl: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUrl,
    response_type: "code",
    scope: GCAL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: orgId,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an OAuth code for tokens and stores them.
 */
export async function connectGoogleCalendar(
  orgId: string,
  code: string,
  redirectUrl: string,
) {
  const supabase = createClient();

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUrl,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return { error: "Failed to get access token from Google." };
  }

  // Get user's email
  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const user = await userRes.json();

  // Store tokens
  const expiresAt = new Date(
    Date.now() + (tokens.expires_in ?? 3600) * 1000,
  ).toISOString();

  const { error } = await supabase.from("google_calendar_syncs").upsert(
    {
      org_id: orgId,
      google_email: user.email ?? "unknown",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      sync_enabled: true,
    },
    { onConflict: "org_id" },
  );

  if (error) return { error: error.message };
  return { success: true, email: user.email };
}

/**
 * Disconnects Google Calendar sync for an org.
 */
export async function disconnectGoogleCalendar(orgId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("google_calendar_syncs")
    .delete()
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Syncs a confirmed booking to Google Calendar.
 */
export async function syncBookingToGoogle(
  orgId: string,
  bookingId: string,
  title: string,
  startTime: string,
  endTime: string,
) {
  const supabase = createClient();

  // Get sync config
  const { data: sync } = await supabase
    .from("google_calendar_syncs")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (!sync || !sync.sync_enabled) return;

  // Check if already synced
  const { data: existing } = await supabase
    .from("google_calendar_events")
    .select("google_event_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing) return; // Already synced

  // Ensure token is fresh
  let token = sync.access_token;
  if (new Date(sync.token_expires_at) < new Date()) {
    token = await refreshAccessToken(sync.refresh_token);
    if (!token) return;
  }

  // Create event in Google Calendar
  const eventRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sync.calendar_id)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        start: { dateTime: startTime, timeZone: "Asia/Manila" },
        end: { dateTime: endTime, timeZone: "Asia/Manila" },
      }),
    },
  );

  const event = await eventRes.json();
  if (event.id) {
    await supabase.from("google_calendar_events").insert({
      sync_id: sync.id,
      booking_id: bookingId,
      google_event_id: event.id,
      direction: "outbound",
    });
  }
}

/**
 * Refreshes an expired Google access token.
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) return null;

  // Update stored token
  const supabase = createClient();
  await supabase
    .from("google_calendar_syncs")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(
        Date.now() + (data.expires_in ?? 3600) * 1000,
      ).toISOString(),
    })
    .eq("refresh_token", refreshToken);

  return data.access_token;
}
