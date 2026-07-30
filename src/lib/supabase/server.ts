import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { isDevAuthEnabled } from "@/lib/dev-auth";

type CookieToSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

const DEV_AUTH_ENABLED = isDevAuthEnabled();

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ORG_SLUG = "marco-pickleball";

const mockSessionData = {
  user: {
    id: MOCK_USER_ID,
    email: "dev@sked.space",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { platform_role: "super_admin", account_status: "active" },
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
      plan: "trial",
      primary_color: "#72c914",
    },
    error: null,
  } as any;

  function makeChain(isOrgMembers: boolean, tableName?: string): any {
    const singleResult = isOrgMembers ? mockResult : emptySingleResult;
    const limitResult = isOrgMembers ? mockArrayResult : emptyResult;

    // Seed data for dev mode
    const seedData: Record<string, any[]> = {
      org_members: [
        { org_id: MOCK_ORG_ID, user_id: MOCK_USER_ID, role: "owner" },
      ],
      organizations: [
        { id: MOCK_ORG_ID, name: "Marco's Pickleball Courts", slug: MOCK_ORG_SLUG, plan: "trial" },
      ],
      pages: [
        {
          org_id: MOCK_ORG_ID,
          theme: "default",
          sections: [],
          cover_url: null,
          logo_url: null,
          bio: "Premium courts, coaching, and open play for the local pickleball community.",
          socials: {},
          is_published: true,
          primary_color: "#72c914",
        },
      ],
      locations: [
        { id: "loc-1", org_id: MOCK_ORG_ID, name: "Main Branch", address: "123 Court St", is_active: true },
      ],
      resources: [
        { id: "court-1", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 1", type: "Outdoor - Hard Court", capacity: 4, is_active: true },
        { id: "court-2", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 2", type: "Outdoor - Hard Court", capacity: 4, is_active: true },
        { id: "court-3", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 3", type: "Indoor - Pro Surface", capacity: 4, is_active: true },
      ],
      services: [
        { id: "svc-1", org_id: MOCK_ORG_ID, name: "Court Rental (1 hr)", duration_min: 60, price_cents: 35000, is_active: true },
        { id: "svc-2", org_id: MOCK_ORG_ID, name: "Court Rental (2 hr)", duration_min: 120, price_cents: 65000, is_active: true },
      ],
      service_resources: [
        { service_id: "svc-1", resource_id: "court-1" },
        { service_id: "svc-1", resource_id: "court-2" },
        { service_id: "svc-1", resource_id: "court-3" },
        { service_id: "svc-2", resource_id: "court-1" },
        { service_id: "svc-2", resource_id: "court-2" },
        { service_id: "svc-2", resource_id: "court-3" },
      ],
      operating_hours: [
        { location_id: "loc-1", weekday: 1, opens_at: "07:00", closes_at: "21:00", is_active: true },
        { location_id: "loc-1", weekday: 2, opens_at: "07:00", closes_at: "21:00", is_active: true },
        { location_id: "loc-1", weekday: 3, opens_at: "07:00", closes_at: "21:00", is_active: true },
        { location_id: "loc-1", weekday: 4, opens_at: "07:00", closes_at: "21:00", is_active: true },
        { location_id: "loc-1", weekday: 5, opens_at: "07:00", closes_at: "21:00", is_active: true },
        { location_id: "loc-1", weekday: 6, opens_at: "08:00", closes_at: "18:00", is_active: true },
      ],
      players: [
        { id: "player-1", org_id: MOCK_ORG_ID, name: "Marco Santos", skill_level: 4.0, status: "active", play_style: "All Court Player" },
        { id: "player-2", org_id: MOCK_ORG_ID, name: "Jenny Lim", skill_level: 3.5, status: "active", play_style: "All Court Player" },
        { id: "player-3", org_id: MOCK_ORG_ID, name: "Rico Dizon", skill_level: 4.0, status: "active", play_style: "All Court Player" },
        { id: "player-4", org_id: MOCK_ORG_ID, name: "Anna Cruz", skill_level: 3.5, status: "active", play_style: "All Court Player" },
      ],
    };

    const tableSeed = tableName ? seedData[tableName] : undefined;
    const seededResult = tableSeed
      ? { data: tableSeed, error: null, count: tableSeed.length }
      : emptyResult;
    const seededSingleResult = tableSeed
      ? { data: tableSeed[0] ?? null, error: null }
      : emptySingleResult;

    return {
      select: () => {
        const c = makeChain(isOrgMembers, tableName);
        // Filters and modifiers stay chainable, matching PostgREST.
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
        ].forEach((m) => {
          c[m] = () => c;
        });
        // Terminal methods resolve. These are assigned *after* the loop above
        // so it cannot overwrite them with chainable stubs.
        c.single = async () => seededSingleResult;
        c.maybeSingle = async () => seededSingleResult;
        // A PostgREST builder is awaitable on its own, so `await select().eq()`
        // has to yield { data, error } rather than the builder itself.
        c.then = (
          resolve: (value: typeof seededResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(seededResult).then(resolve, reject);
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
      update: () => {
        const c = makeChain(isOrgMembers);
        ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains", "filter", "order", "limit", "range", "maybeSingle", "single"].forEach((m) => {
          c[m] = () => c;
        });
        return c;
      },
      delete: () => {
        const c = makeChain(isOrgMembers);
        ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains", "filter", "order", "limit", "range", "maybeSingle", "single"].forEach((m) => {
          c[m] = () => c;
        });
        return c;
      },
      single: async () => singleResult,
      limit: async () => limitResult,
      maybeSingle: async () => singleResult,
      // Write chains (`insert`/`update`/`delete`, optionally followed by
      // filters) are awaited directly for their error, so they must resolve.
      then: (
        resolve: (value: typeof emptySingleResult) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(emptySingleResult).then(resolve, reject),
    };
  }

  return {
    auth: {
      getSession: async () => ({
        data: { session: mockSessionData },
        error: null,
      }),
      getUser: async () => ({
        data: { user: mockSessionData.user },
        error: null,
      }),
      // Dev mode has no real session to tear down — middleware bypasses auth
      // entirely — so this just lets /auth/signout complete its redirect.
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({
        data: { session: mockSessionData, user: mockSessionData.user },
        error: null,
      }),
      verifyOtp: async () => ({
        data: { session: mockSessionData, user: mockSessionData.user },
        error: null,
      }),
    },
    from: (table: string) => makeChain(table === "org_members", table),
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
          // Server Components render with a read-only cookie store, so writing
          // a rotated refresh token throws there. Swallowing it is safe: the
          // middleware client runs on every request and persists the refreshed
          // cookies. Without this guard the throw escapes `auth.getSession()`
          // and takes down the whole page render instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // no-op — see above
          }
        },
      },
    },
  );
}
