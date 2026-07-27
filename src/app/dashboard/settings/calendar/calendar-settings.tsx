"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type SyncConfig = {
  id: string;
  google_email: string;
  calendar_id: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
} | null;

export function CalendarSettings({
  orgId,
  isOwner,
  sync,
}: {
  orgId: string;
  isOwner: boolean;
  sync: SyncConfig;
}) {
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/callback`
      : "";

  async function handleConnect() {
    setConnecting(true);
    // Redirect to Google OAuth
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
      prompt: "consent",
      state: orgId,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async function handleDisconnect() {
    const supabase = createClient();
    await supabase.from("google_calendar_syncs").delete().eq("org_id", orgId);
    router.refresh();
  }

  async function handleToggle() {
    const supabase = createClient();
    await supabase
      .from("google_calendar_syncs")
      .update({ sync_enabled: !sync?.sync_enabled })
      .eq("org_id", orgId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {sync ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Connected</CardTitle>
              <CardDescription>
                Syncing with {sync.google_email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={sync.sync_enabled ? "default" : "secondary"}>
                  {sync.sync_enabled ? "Active" : "Paused"}
                </Badge>
              </div>
              {sync.last_synced_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last synced</span>
                  <span className="text-sm">
                    {new Date(sync.last_synced_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleToggle}>
                  {sync.sync_enabled ? "Pause sync" : "Resume sync"}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✅ New confirmed bookings are automatically added to your Google Calendar.</p>
              <p>🔄 Updated bookings sync their calendar event times.</p>
              <p>❌ Cancelled bookings remove the calendar event.</p>
              <p>📥 External calendar events appear as time blocks (unavailable slots).</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Not connected</CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically sync bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  After connecting, confirmed bookings will appear as events in
                  your calendar. Events from your calendar will be shown as
                  busy time (blocking new bookings).
                </p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll need to set up a Google Cloud project with the
                  Calendar API enabled and configure{" "}
                  <code>GOOGLE_CLIENT_ID</code> and{" "}
                  <code>GOOGLE_CLIENT_SECRET</code> environment variables.
                </p>
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? "Redirecting..." : "Connect Google Calendar"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners can connect Google Calendar.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
