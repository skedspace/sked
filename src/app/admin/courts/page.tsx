import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminCourtList,
  type AdminCourtListData,
  type AdminCourtRow,
  type CourtStatus,
} from "./admin-court-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ResourceRow = {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  type: string;
  capacity: number;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type LocationRow = {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
};

type BookingRow = {
  id: string;
  org_id: string;
  resource_id: string;
  status: string;
  time_range: string;
};

function asDate(value: string | string[] | undefined, fallback: Date) {
  const raw = Array.isArray(value) ? value[0] : value;
  const date = raw ? new Date(`${raw}T00:00:00`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseRange(range: string | null | undefined) {
  if (!range) return null;
  const match = range.match(/\[([^,]+),([^)\]]+)/);
  if (!match) return null;
  const start = new Date(match[1]!);
  const end = new Date(match[2]!);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function bookingMinutes(bookings: BookingRow[]) {
  return bookings.reduce((total, booking) => {
    if (booking.status === "cancelled" || booking.status === "no_show") return total;
    const range = parseRange(booking.time_range);
    if (!range) return total;
    return total + Math.max(0, Math.round((range.end.getTime() - range.start.getTime()) / 60_000));
  }, 0);
}

function statusFor(resource: ResourceRow): CourtStatus {
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

function amenities(resource: ResourceRow) {
  const items = ["lights"];
  if (resource.capacity >= 4) items.push("seating");
  if (resource.type.toLowerCase().includes("outdoor")) items.push("parking");
  return items as AdminCourtRow["amenities"];
}

export default async function AdminCourts({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = endOfDay(new Date());
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const rawFrom = startOfDay(asDate(params.from, monthAgo));
  const rawTo = endOfDay(asDate(params.to, today));
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const supabase = createAdminClient();
  const [resourceResult, orgResult, locationResult, bookingResult] = await Promise.all([
    supabase
      .from("resources")
      .select("id, org_id, location_id, name, type, capacity, is_active, photo_url, created_at, updated_at")
      .order("name")
      .limit(5000),
    supabase.from("organizations").select("id, name, slug, logo_url").limit(5000),
    supabase.from("locations").select("id, org_id, name, address").limit(5000),
    supabase
      .from("bookings")
      .select("id, org_id, resource_id, status, time_range")
      .filter("time_range", "ov", `[${from.toISOString()},${to.toISOString()})`)
      .limit(50000),
  ]);

  const resources = (resourceResult.data ?? []) as ResourceRow[];

  const orgById = new Map(((orgResult.data ?? []) as OrganizationRow[]).map((org) => [org.id, org]));
  const locationById = new Map(((locationResult.data ?? []) as LocationRow[]).map((location) => [location.id, location]));
  const bookingsByResource = new Map<string, BookingRow[]>();
  ((bookingResult.data ?? []) as BookingRow[]).forEach((booking) => {
    bookingsByResource.set(booking.resource_id, [...(bookingsByResource.get(booking.resource_id) ?? []), booking]);
  });
  const selectedDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
  const availableMinutes = selectedDays * 12 * 60;

  const rows: AdminCourtRow[] = resources.map((resource, index) => {
    const organization = orgById.get(resource.org_id);
    const location = locationById.get(resource.location_id);
    const usedMinutes = bookingMinutes(bookingsByResource.get(resource.id) ?? []);
    return {
      id: resource.id,
      code: `C${String(index + 1).padStart(3, "0")}`,
      name: resource.name,
      orgId: resource.org_id,
      orgSlug: organization?.slug || resource.org_id,
      orgName: organization?.name || "Unknown organization",
      orgLocation: location?.address || location?.name || "Location not set",
      orgLogoUrl: organization?.logo_url || null,
      type: courtType(resource.type),
      status: statusFor(resource),
      surface: surface(resource.type),
      capacity: resource.capacity,
      amenities: amenities(resource),
      lastMaintenanceAt: resource.updated_at,
      photoUrl: resource.photo_url,
      utilization: Math.min(100, Math.round((usedMinutes / availableMinutes) * 100)),
      locationId: resource.location_id,
    };
  });

  const total = rows.length || 1;
  const active = rows.filter((row) => row.status === "active").length;
  const maintenance = rows.filter((row) => row.status === "maintenance").length;
  const disabled = rows.filter((row) => row.status === "disabled").length;
  const utilization = Math.round(rows.reduce((sum, row) => sum + row.utilization, 0) / total);

  const notifications = [
    ...rows
      .filter((row) => row.status === "maintenance" || row.status === "disabled")
      .map((row) => ({
        id: `status-${row.id}`,
        title: row.status === "maintenance" ? "Court under maintenance" : "Court disabled",
        detail: `${row.orgName} - ${row.name}`,
        at: row.lastMaintenanceAt || new Date().toISOString(),
      })),
    ...rows
      .filter((row) => row.utilization >= 80)
      .map((row) => ({
        id: `utilization-${row.id}`,
        title: "High court utilization",
        detail: `${row.orgName} - ${row.name} is at ${row.utilization}%`,
        at: row.lastMaintenanceAt || new Date().toISOString(),
      })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 6);

  const data: AdminCourtListData = {
    range: { from: dateKey(from), to: dateKey(to) },
    totalAvailable: rows.length,
    metrics: [
      { key: "total", label: "Total Courts", value: rows.length, change: 0, tone: "cyan" },
      { key: "active", label: "Active Courts", value: active, change: 0, detail: `${((active / total) * 100).toFixed(1)}% of total`, tone: "green" },
      { key: "maintenance", label: "Under Maintenance", value: maintenance, change: 0, detail: `${((maintenance / total) * 100).toFixed(1)}% of total`, tone: "orange" },
      { key: "disabled", label: "Disabled Courts", value: disabled, change: 0, detail: `${((disabled / total) * 100).toFixed(1)}% of total`, tone: "purple" },
      { key: "utilization", label: "Avg. Utilization", value: utilization, change: 0, suffix: "%", tone: "cyan" },
    ],
    courts: rows,
    organizations: Array.from(new Map(rows.map((row) => [row.orgId, { id: row.orgId, name: row.orgName }])).values()),
    locations: ((locationResult.data ?? []) as LocationRow[]).map((location) => ({
      id: location.id,
      orgId: location.org_id,
      name: location.name,
      address: location.address,
    })),
    notifications,
    demo: false,
  };

  return <AdminCourtList data={data} />;
}
