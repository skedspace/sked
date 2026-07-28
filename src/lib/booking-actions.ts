"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string; alternatives?: Array<{ start_time: string; resource_name: string }> };

export async function createBooking(formData: FormData): Promise<BookingResult> {
  const supabase = createClient();

  const serviceId = formData.get("service_id") as string;
  const resourceId = formData.get("resource_id") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const customerName = formData.get("name") as string;
  const customerEmail = formData.get("email") as string;
  const customerPhone = formData.get("phone") as string;
  const orgId = formData.get("org_id") as string;
  const priceCents = parseInt(formData.get("price_cents") as string, 10);
  const idempotencyKey = formData.get("idempotency_key") as string || randomUUID();

  if (!serviceId || !resourceId || !startTime || !customerName || !orgId) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    // 1. Find or create customer
    let customerId: string | null = null;

    if (customerEmail) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("org_id", orgId)
        .eq("email", customerEmail)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      }
    }

    if (!customerId && customerPhone) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("org_id", orgId)
        .eq("phone", customerPhone)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      }
    }

    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          org_id: orgId,
          name: customerName,
          email: customerEmail || null,
          phone: customerPhone || null,
        })
        .select("id")
        .single();

      if (!newCustomer) {
        return { success: false, error: "Failed to create customer." };
      }
      customerId = newCustomer.id;
    }

    // 1.5 Auto-create a player linked to this customer
    // Customers are also players — we need player records for board view, matches, tournaments, reports.
    const customerNameForPlayer = customerName;
    const customerEmailForPlayer = customerEmail;
    const customerPhoneForPlayer = customerPhone;

    // Check if a player already exists linked to this customer
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("id")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!existingPlayer) {
      // Also check by email or phone (in case they were added onsite first)
      let matchedPlayerId: string | null = null;
      if (customerEmailForPlayer) {
        const { data: byEmail } = await supabase
          .from("players")
          .select("id")
          .eq("org_id", orgId)
          .eq("email", customerEmailForPlayer)
          .maybeSingle();
        if (byEmail) matchedPlayerId = byEmail.id;
      }
      if (!matchedPlayerId && customerPhoneForPlayer) {
        const { data: byPhone } = await supabase
          .from("players")
          .select("id")
          .eq("org_id", orgId)
          .eq("phone", customerPhoneForPlayer)
          .maybeSingle();
        if (byPhone) matchedPlayerId = byPhone.id;
      }

      if (matchedPlayerId) {
        // Link existing player to this customer
        await supabase
          .from("players")
          .update({ customer_id: customerId })
          .eq("id", matchedPlayerId);
      } else {
        // Create a new player with default skill level 2.0 (beginner)
        await supabase.from("players").insert({
          org_id: orgId,
          customer_id: customerId,
          name: customerNameForPlayer,
          email: customerEmailForPlayer || null,
          phone: customerPhoneForPlayer || null,
          skill_level: 2.0,
          play_style: "All Court Player",
          status: "active",
        });
      }
    }

    // 3. Check plan limits before creating booking
    const { data: planCheck } = await supabase.rpc("can_create_booking", {
      p_org_id: orgId,
    });

    if (planCheck && planCheck.length > 0 && !planCheck[0].allowed) {
      return {
        success: false,
        error: planCheck[0].reason ?? "Monthly booking limit reached.",
      };
    }

    // 4. Create the booking with idempotency key
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        org_id: orgId,
        resource_id: resourceId,
        service_id: serviceId,
        customer_id: customerId,
        time_range: `[${startTime},${endTime})`,
        status: "confirmed",
        price_cents: priceCents,
        source: "public",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (error) {
      if (error.message?.includes("no_overlap_when_held_or_confirmed")) {
        const slug = formData.get("org_slug") as string;
        const date = startTime.split("T")[0];
        const { data: alternatives } = await supabase.rpc("get_available_slots", {
          p_org_slug: slug,
          p_service_id: serviceId,
          p_date: date,
        });

        return {
          success: false,
          error: "That slot was just taken. Please choose another.",
          alternatives: (alternatives ?? []).slice(0, 3).map((a: any) => ({
            start_time: a.start_time,
            resource_name: a.resource_name,
          })),
        };
      }

      return { success: false, error: error.message };
    }

    // 5. Increment usage counter and log audit
    await supabase.rpc("increment_usage", { p_org_id: orgId });
    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: (await supabase.auth.getSession()).data.session?.user.id ?? "00000000-0000-0000-0000-000000000000",
      action: "booking.created",
      target: `booking:${booking.id}`,
      payload: { resource_id: resourceId, service_id: serviceId, source: "public" },
    });

    revalidatePath("/dashboard");
    return { success: true, bookingId: booking.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const supabase = createClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason ?? null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  const { data: cancelledBooking } = await supabase
    .from("bookings")
    .select("org_id, resource_id, service_id, time_range")
    .eq("id", bookingId)
    .single();

  if (cancelledBooking) {
    const rangeMatch = cancelledBooking.time_range?.match(
      /\[([^,]+),([^\]]+)/,
    );
    const startTime = rangeMatch?.[1] ? new Date(rangeMatch[1]) : null;
    if (startTime) {
      const dateStr = startTime.toISOString().split("T")[0];
      const timeStr = startTime.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      await supabase.rpc("notify_waitlist_for_slot", {
        p_org_id: cancelledBooking.org_id,
        p_resource_id: cancelledBooking.resource_id,
        p_service_id: cancelledBooking.service_id,
        p_desired_date: dateStr,
        p_desired_start_time: timeStr,
      });
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
