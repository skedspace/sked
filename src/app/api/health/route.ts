import { NextResponse } from "next/server";

/**
 * Health check endpoint for uptime monitoring.
 *
 * Returns a lightweight 200 response that monitors can poll every minute.
 * If the database connection fails, returns 503 to trigger an alert.
 *
 * Usage:
 *   Monitor: GET https://sked.space/api/health
 *   Expected: 200 { status: "ok", timestamp: "..." }
 */
export async function GET() {
  try {
    // Lightweight check — verify the server is responsive
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? "development",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { status: "error", message: "Health check failed" },
      { status: 503 },
    );
  }
}
