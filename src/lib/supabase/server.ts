import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

type CookieToSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

const DEV_AUTH_ENABLED = process.env.NODE_ENV !== "production";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ORG_SLUG = "marco-pickleball";

const mockSessionData = {
  user: {
    id: MOCK_USER_ID,
    email: "dev@sked.space",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  expires_in: 86400,
  access_token: "dev-mode-token",
  refresh_token: "dev-mode-refresh",
};

function createMockClient() {
  const mockResult = {
    data: { org_id: MOCK_ORG_ID, role: "owner" as const },
    error: null,
  } as any;
  const mockArrayResult = {
    data: [{ org_id: MOCK_ORG_ID, role: "owner" as const }],
    error: null,
  } as any;
  const emptyResult = { data: [], error: null } as any;
  const emptySingleResult = { data: null, error: null } as any;
  const mockPublicPageResult = {
    data: {
      org_id: MOCK_ORG_ID,
      org_name: "Marco's Pickleball Courts",
      org_slug: MOCK_ORG_SLUG,
      bio: "SKED helps facilities, clubs, and players manage courts, bookings, payments, and communities in one smart platform.",
      cover_url: null,
      logo_url: null,
      socials: {},
      sections: [],
      theme: "default",
      services: [
        {
          id: "00000000-0000-0000-0000-000000000101",
          name: "Court Booking",
          duration_min: 60,
          price_cents: 2000,
          payment_mode: "free",
          deposit_cents: null,
        },
      ],
      is_published: true,
      plan: "free",
    },
    error: null,
  } as any;

  function makeChain(isOrgMembers: boolean): any {
    const singleResult = isOrgMembers ? mockResult : emptySingleResult;
    const limitResult = isOrgMembers ? mockArrayResult : emptyResult;
    return {
      select: () => {
        const c = makeChain(isOrgMembers);
        c.single = async () => singleResult;
        c.limit = async () => limitResult;
        c.maybeSingle = async () => singleResult;
        [
          "eq",
          "neq",
          "gt",
          "gte",
          "lt",
          "lte",
          "like",
          "ilike",
          "is",
          "in",
          "contains",
          "filter",
          "order",
          "limit",
          "range",
          "maybeSingle",
        ].forEach((m) => {
          c[m] = () => c;
        });
        return c;
      },
      insert: (value: unknown) => {
        const c = makeChain(isOrgMembers);
        c.select = () => {
          const sc = makeChain(isOrgMembers);
          sc.single = async () => ({
            data: { id: "00000000-0000-0000-0000-000000000099", ...(value as object) },
            error: null,
          });
          return sc;
        };
        return c;
      },
      upsert: (value: unknown) => {
        const c = makeChain(isOrgMembers);
        c.select = () => {
          const sc = makeChain(isOrgMembers);
          sc.single = async () => ({
            data: { id: "00000000-0000-0000-0000-000000000099", ...(value as object) },
            error: null,
          });
          return sc;
        };
        return c;
      },
      update: () => makeChain(isOrgMembers),
      delete: () => makeChain(isOrgMembers),
      single: async () => singleResult,
      limit: async () => limitResult,
      maybeSingle: async () => singleResult,
    };
  }

  return {
    auth: {
      getSession: async () => ({
        data: { session: mockSessionData },
        error: null,
      }),
    },
    from: (table: string) => makeChain(table === "org_members"),
    rpc: (fn: string, args?: Record<string, unknown>) => {
      const result =
        fn === "get_public_page" && args?.page_slug === MOCK_ORG_SLUG
          ? mockPublicPageResult
          : emptyResult;

      return {
        single: async () => result,
        maybeSingle: async () => result,
        then: (
          resolve: (value: typeof result) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject),
      };
    },
  };
}

export function createClient() {
  // Dev mode: skip real Supabase entirely to avoid network timeouts.
  // Return a mock client that never makes network calls.
  if (DEV_AUTH_ENABLED) {
    return createMockClient() as any;
  }

  // Production mode: use real Supabase client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
