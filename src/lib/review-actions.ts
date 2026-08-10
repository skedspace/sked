"use server";

import { createClient } from "@/lib/supabase/server";

export type ReviewResult =
  | { success: true; rating: number }
  | { success: false; error: string };

/**
 * Error tokens raised by `submit_public_review` (migration 00046). The RPC
 * deliberately returns the same `REVIEW_NO_MATCH` for "no such contact" and
 * "wrong date" so the endpoint cannot be used to probe whether a given person
 * booked on a given day — that property only holds if the UI keeps the two
 * indistinguishable too, so both map to one message here.
 */
const MESSAGES: Record<string, string> = {
  REVIEW_NO_MATCH:
    "We couldn't match that to a visit. Check the email or phone number you booked with, and the date you played.",
  REVIEW_ALREADY_SUBMITTED:
    "Thanks — it looks like a review for that visit has already been submitted.",
};

function messageFor(raw: string | undefined): string {
  if (!raw) return "Something went wrong. Please try again.";
  for (const token of Object.keys(MESSAGES)) {
    if (raw.includes(token)) return MESSAGES[token]!;
  }
  // 22023 is the RPC's check-violation code for rating/title/body problems.
  // The client validates these already, so reaching here means a direct post.
  if (raw.includes("rating must be")) return "Please choose a rating from 1 to 5 stars.";
  if (raw.includes("required")) return "Please fill in every field.";
  return "Something went wrong. Please try again.";
}

export async function submitPublicReview(formData: FormData): Promise<ReviewResult> {
  const slug = String(formData.get("slug") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const bookingDate = String(formData.get("booking_date") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rating = Number.parseInt(String(formData.get("rating") ?? ""), 10);

  if (!slug || !contact || !bookingDate || !title || !body) {
    return { success: false, error: "Please fill in every field." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Please choose a rating from 1 to 5 stars." };
  }

  const supabase = createClient();

  // Runs as `anon`. The RPC is SECURITY DEFINER and is the only public write
  // path into `reviews` — anon holds no policy on the table, consistent with
  // 00044/00045. Everything lands `pending` for owner moderation.
  const { error } = await supabase.rpc("submit_public_review", {
    p_org_slug: slug,
    p_contact: contact,
    p_booking_date: bookingDate,
    p_rating: rating,
    p_title: title,
    p_body: body,
  });

  if (error) {
    return { success: false, error: messageFor(error.message) };
  }

  // The rating comes back so the thank-you step knows whether to offer the
  // Google handoff, without a second round trip.
  return { success: true, rating };
}
