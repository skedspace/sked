import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersList } from "./customers-list";
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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = createClient();
  const params = await searchParams;
  const selectedDate = getRequestedDate(params?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const { data: customers, count } = await supabase
    .from("customers")
    .select(
      `
      id, name, email, phone, notes, no_show_count, created_at,
      bookings(
        id, time_range, status, price_cents, created_at,
        resources(id, name),
        services(id, name),
        payments(id, amount_cents, status)
      )
    `,
      { count: "exact" },
    )
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <CustomersList
      orgId={membership.org_id}
      customers={(customers ?? []) as any[]}
      totalCount={count ?? customers?.length ?? 0}
      selectedDate={selectedDate.toISOString()}
      weekStart={weekStart.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}
