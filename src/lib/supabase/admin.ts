import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service-role access.
 *
 * The service role does not use a browser session, so binding it to Next.js
 * cookies only adds latency and breaks on async request APIs in Next 15.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
