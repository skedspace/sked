import { NextResponse } from "next/server";
import { connectGoogleCalendar } from "@/lib/gcal-sync";

/**
 * OAuth callback for Google Calendar sync.
 *
 * Google redirects here after the user grants/denies permission.
 * On success, redirects to the calendar settings page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");
  const error = searchParams.get("error");

  // Get the base URL for redirect_uri matching
  const baseUrl = `${new URL(request.url).origin}/api/calendar/callback`;

  if (error || !code || !orgId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/calendar?error=auth_failed", request.url),
    );
  }

  await connectGoogleCalendar(orgId, code, baseUrl);

  return NextResponse.redirect(
    new URL("/dashboard/settings/calendar?connected=true", request.url),
  );
}
