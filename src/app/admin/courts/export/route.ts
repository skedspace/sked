import { NextRequest } from "next/server";
import { superAdminRouteGuard } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ResourceRow = {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  type: string;
  capacity: number;
  is_active: boolean;
  photo_url: string | null;
  updated_at: string;
};

function date(value: string | null, fallback: Date, end = false) {
  const parsed = value ? new Date(`${value}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

function key(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function statusFor(resource: ResourceRow) {
  if (!resource.is_active) return "disabled";
  if (resource.type.toLowerCase().includes("maintenance")) return "maintenance";
  return "active";
}

function courtType(type: string) {
  return type.toLowerCase().includes("indoor") ? "indoor" : "outdoor";
}

function surface(type: string) {
  const lowered = type.toLowerCase();
  if (lowered.includes("wood")) return "Wood";
  if (lowered.includes("premium") || lowered.includes("pro")) return "Premium Indoor";
  if (lowered.includes("cushion")) return "Cushion";
  return "Acrylic";
}

export async function GET(request: NextRequest) {
  const denied = await superAdminRouteGuard();
  if (denied) return denied;

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const from = date(request.nextUrl.searchParams.get("from"), monthAgo);
  const to = date(request.nextUrl.searchParams.get("to"), today, true);
  const supabase = createAdminClient();

  const [resources, organizations, locations, bookings] = await Promise.all([
    supabase
      .from("resources")
      .select("id, org_id, location_id, name, type, capacity, is_active, photo_url, updated_at")
      .order("name")
      .limit(50000),
    supabase.from("organizations").select("id, name, slug").limit(5000),
    supabase.from("locations").select("id, org_id, name, address").limit(5000),
    supabase
      .from("bookings")
      .select("resource_id")
      .filter("time_range", "ov", `[${from.toISOString()},${to.toISOString()})`)
      .limit(50000),
  ]);

  const orgById = new Map((organizations.data ?? []).map((org) => [org.id, org]));
  const locationById = new Map((locations.data ?? []).map((location) => [location.id, location]));
  const bookingCounts = new Map<string, number>();
  (bookings.data ?? []).forEach((booking) => {
    bookingCounts.set(booking.resource_id, (bookingCounts.get(booking.resource_id) || 0) + 1);
  });

  const rows = [
    ["court_id", "court_code", "name", "organization", "organization_slug", "location", "type", "status", "surface", "capacity", "bookings_in_period", "last_maintenance_or_update", "photo_url"],
    ...((resources.data ?? []) as ResourceRow[]).map((resource, index) => {
      const org = orgById.get(resource.org_id);
      const location = locationById.get(resource.location_id);
      return [
        resource.id,
        `C${String(index + 1).padStart(3, "0")}`,
        resource.name,
        org?.name || "",
        org?.slug || "",
        location?.address || location?.name || "",
        courtType(resource.type),
        statusFor(resource),
        surface(resource.type),
        resource.capacity,
        bookingCounts.get(resource.id) || 0,
        resource.updated_at,
        resource.photo_url || "",
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-courts-${key(from)}-${key(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
