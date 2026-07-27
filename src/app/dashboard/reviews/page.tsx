import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewsView } from "./reviews-view";
import { getSession, getMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRequestedDate(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return new Date();

  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = createClient();
  const db = supabase as any;
  const params = await searchParams;
  const selectedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const reviewsResult = await db
    .from("reviews")
    .select(
      `
      id, org_id, customer_id, resource_id, booking_id, title, body, rating,
      source, status, response, reviewed_at, created_at,
      customers(id, name, email),
      resources(id, name, type),
      bookings(id, time_range, status)
    `,
      { count: "exact" },
    )
    .eq("org_id", membership.org_id)
    .order("reviewed_at", { ascending: false })
    .limit(500);

  const [customersResult, resourcesResult, bookingsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("org_id", membership.org_id)
      .order("name")
      .limit(300),
    supabase
      .from("resources")
      .select("id, name, type, is_active")
      .eq("org_id", membership.org_id)
      .order("name"),
    supabase
      .from("bookings")
      .select(
        `
        id, time_range, status,
        customers(id, name, email),
        resources(id, name, type)
      `,
      )
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  return (
    <ReviewsView
      orgId={membership.org_id}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
      reviews={(reviewsResult.error ? [] : (reviewsResult.data ?? [])) as any[]}
      customers={(customersResult.data ?? []) as any[]}
      resources={(resourcesResult.data ?? []) as any[]}
      bookings={(bookingsResult.data ?? []) as any[]}
      schemaReady={!reviewsResult.error}
    />
  );
}
