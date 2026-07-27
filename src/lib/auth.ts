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
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .single();
  return data as { org_id: string; role: string } | null;
});
