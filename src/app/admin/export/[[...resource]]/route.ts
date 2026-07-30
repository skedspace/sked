import type { NextRequest } from "next/server";
import { GET as analytics } from "@/lib/admin-exports/analytics";
import { GET as auditLogs } from "@/lib/admin-exports/audit-logs";
import { GET as bookings } from "@/lib/admin-exports/bookings";
import { GET as courts } from "@/lib/admin-exports/courts";
import { GET as integrations } from "@/lib/admin-exports/integrations";
import { GET as organizations } from "@/lib/admin-exports/organizations";
import { GET as payments } from "@/lib/admin-exports/payments";
import { GET as platformSettings } from "@/lib/admin-exports/platform-settings";
import { GET as pricing } from "@/lib/admin-exports/pricing";
import { GET as promotions } from "@/lib/admin-exports/promotions";
import { GET as subscriptions } from "@/lib/admin-exports/subscriptions";
import { GET as users } from "@/lib/admin-exports/users";
import { GET as summary } from "@/lib/admin-exports/summary";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const handlers = {
  analytics,
  "audit-logs": auditLogs,
  bookings,
  courts,
  integrations,
  organizations,
  payments,
  "platform-settings": platformSettings,
  pricing,
  promotions,
  subscriptions,
  users,
  summary,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource?: string[] }> },
) {
  const resource = (await params).resource?.[0] ?? "summary";
  const handler = handlers[resource as keyof typeof handlers];
  if (!handler) {
    return NextResponse.json(
      { error: "Unknown export resource." },
      { status: 404 },
    );
  }
  return handler(request);
}
