import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Cached session fetcher — deduplicates calls within the same React render pass.
 * Layout + page both call this; only the first call hits the real client.
 */
export const getSession = cache(async () => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

/**
 * Cached membership fetcher — uses getSession internally.
 * Deduplicates org_members queries so layout + page share the result.
 */
export const getMembership = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const supabase = createClient();
  // `single()` errors when a user ends up in more than one organization, which
  // used to strand them in an /onboarding ↔ /dashboard bounce. Take the oldest
  // membership instead, preferring an owner row.
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .order("role", { ascending: true }) // 'owner' sorts before 'staff'
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    // A failure here is indistinguishable from "no organization yet" to the
    // caller, and the caller redirects to onboarding — so log it, otherwise a
    // broken RLS policy looks like an incomplete signup.
    console.error("[getMembership]", error.message);
    return null;
  }

  return data as { org_id: string; role: string } | null;
});
