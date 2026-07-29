"use server";

import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminBookingStatus } from "./admin-booking-list";

type ActionResult = {
  ok: boolean;
  error?: string;
};

function dbStatus(status: AdminBookingStatus) {
  return status === "upcoming" ? "confirmed" : status;
}

export async function updateAdminBookingStatusAction(
  bookingId: string,
  status: AdminBookingStatus,
): Promise<ActionResult> {
  if (!bookingId) return { ok: false, error: "Booking is required." };
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const result = await supabase
    .from("bookings")
    .update({ status: dbStatus(status) })
    .eq("id", bookingId);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true };
}
