"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CourtStatus } from "./admin-court-list";

type ActionResult = {
  ok: boolean;
  error?: string;
};

function courtPayload(type: string, status: CourtStatus) {
  const baseType = type.trim() || "Outdoor - Acrylic";
  if (status === "maintenance") {
    return { type: `Maintenance - ${baseType.replace(/^Maintenance - /, "")}`, is_active: true };
  }
  return { type: baseType.replace(/^Maintenance - /, ""), is_active: status === "active" };
}

export async function createCourtAction(input: {
  orgId: string;
  locationId: string;
  name: string;
  type: string;
  capacity: number;
  status: CourtStatus;
  photoUrl?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Court name is required." };
  if (!input.orgId) return { ok: false, error: "Choose an organization." };
  if (!input.locationId) return { ok: false, error: "Choose a location." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const location = await supabase
    .from("locations")
    .select("id")
    .eq("id", input.locationId)
    .eq("org_id", input.orgId)
    .maybeSingle();

  if (location.error) return { ok: false, error: location.error.message };
  if (!location.data) return { ok: false, error: "Location does not belong to the selected organization." };

  const statusPayload = courtPayload(input.type, input.status);
  const result = await supabase.from("resources").insert({
    org_id: input.orgId,
    location_id: input.locationId,
    name,
    capacity: Math.max(1, Math.round(input.capacity || 4)),
    photo_url: input.photoUrl?.trim() || null,
    ...statusPayload,
  });

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/courts");
  return { ok: true };
}

export async function updateCourtAction(
  courtId: string,
  input: {
    name: string;
    type: string;
    capacity: number;
    status: CourtStatus;
    photoUrl?: string;
  },
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!courtId) return { ok: false, error: "Court is required." };
  if (name.length < 2) return { ok: false, error: "Court name is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const statusPayload = courtPayload(input.type, input.status);
  const result = await supabase
    .from("resources")
    .update({
      name,
      capacity: Math.max(1, Math.round(input.capacity || 4)),
      photo_url: input.photoUrl?.trim() || null,
      ...statusPayload,
    })
    .eq("id", courtId);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/courts");
  return { ok: true };
}

export async function updateCourtStatusAction(
  courtId: string,
  status: CourtStatus,
): Promise<ActionResult> {
  if (!courtId) return { ok: false, error: "Court is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const current = await supabase.from("resources").select("type").eq("id", courtId).maybeSingle();
  if (current.error) return { ok: false, error: current.error.message };
  if (!current.data) return { ok: false, error: "Court was not found." };

  const result = await supabase
    .from("resources")
    .update(courtPayload(String(current.data.type || "Outdoor - Acrylic"), status))
    .eq("id", courtId);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/courts");
  return { ok: true };
}
