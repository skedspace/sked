import { createServerClient } from "@supabase/ssr";

/**
 * Creates a Supabase admin client using the service_role key.
 * ONLY use in:
 *  - Webhook handlers (payment callbacks)
 *  - Cron job functions
 *  - Admin-only server actions (carefully reviewed)
 *
 * Never expose to the client or use in user-facing routes.
 */
export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
