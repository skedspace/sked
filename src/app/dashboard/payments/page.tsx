import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "./payments-view";
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

export default async function PaymentsPage({
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

  const enhancedPaymentsResult = await db
    .from("payments")
    .select(
      `
      id, booking_id, org_id, customer_id, provider, provider_ref, type,
      category, payment_method, description, amount_cents, status, created_at,
      bookings(
        id, org_id, time_range, status, price_cents,
        customers(id, name, email),
        services(id, name),
        resources(id, name, type)
      ),
      customers(id, name, email)
    `,
      { count: "exact" },
    )
    .gte("created_at", weekStart.toISOString())
    .lt("created_at", weekEnd.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const fallbackPaymentsResult = enhancedPaymentsResult.error
    ? await db
        .from("payments")
        .select(
          `
          id, booking_id, provider, provider_ref, type,
          amount_cents, status, created_at,
          bookings(
            id, org_id, time_range, status, price_cents,
            customers(id, name, email),
            services(id, name),
            resources(id, name, type)
          )
        `,
          { count: "exact" },
        )
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(200)
    : enhancedPaymentsResult;

  const [bookingsResult, customersResult] = await Promise.all([
    db
      .from("bookings")
      .select(
        `
        id, org_id, time_range, status, price_cents,
        customers(id, name, email),
        services(id, name),
        resources(id, name, type)
      `,
      )
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(150),
    db
      .from("customers")
      .select("id, name, email, phone, created_at")
      .eq("org_id", membership.org_id)
      .order("name")
      .limit(250),
  ]);

  return (
    <PaymentsView
      orgId={membership.org_id}
      payments={(fallbackPaymentsResult.data ?? []) as any[]}
      bookings={(bookingsResult.data ?? []) as any[]}
      customers={(customersResult.data ?? []) as any[]}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
      schemaReady={!enhancedPaymentsResult.error}
    />
  );
}
