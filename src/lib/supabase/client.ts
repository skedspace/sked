import type { Database } from "@/lib/database.types";
import { isDevAuthEnabled } from "@/lib/dev-auth";

// Only import the real client in production to avoid bundling Supabase in dev
let createBrowserClient: typeof import("@supabase/ssr")["createBrowserClient"] | null = null;
if (!isDevAuthEnabled()) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  createBrowserClient = require("@supabase/ssr").createBrowserClient;
}

// ── Module-level mock store ──
// Persists across renders within the same page session.
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@sked.space",
};

const store = new Map<string, Record<string, unknown>[]>();

function seedStore() {
  store.set("organizations", [
    { id: MOCK_ORG_ID, name: "Marco's Pickleball Courts", slug: "marco-pickleball", plan: "trial" },
  ]);
  store.set("pages", [
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
  ]);
  store.set("locations", [
    { id: "loc-1", org_id: MOCK_ORG_ID, name: "Main Branch", address: "123 Court St", is_active: true },
  ]);
  store.set("resources", [
    { id: "court-1", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 1", type: "Outdoor - Hard Court", capacity: 4, is_active: true },
    { id: "court-2", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 2", type: "Outdoor - Hard Court", capacity: 4, is_active: true },
    { id: "court-3", org_id: MOCK_ORG_ID, location_id: "loc-1", name: "Court 3", type: "Indoor - Pro Surface", capacity: 4, is_active: true },
  ]);
  store.set("services", [
    { id: "svc-1", org_id: MOCK_ORG_ID, name: "Court Rental (1 hr)", duration_min: 60, price_cents: 35000, is_active: true },
    { id: "svc-2", org_id: MOCK_ORG_ID, name: "Court Rental (2 hr)", duration_min: 120, price_cents: 65000, is_active: true },
  ]);
  store.set("service_resources", [
    { service_id: "svc-1", resource_id: "court-1" },
    { service_id: "svc-1", resource_id: "court-2" },
    { service_id: "svc-1", resource_id: "court-3" },
    { service_id: "svc-2", resource_id: "court-1" },
    { service_id: "svc-2", resource_id: "court-2" },
    { service_id: "svc-2", resource_id: "court-3" },
  ]);
  store.set("operating_hours", [
    { location_id: "loc-1", weekday: 1, opens_at: "07:00", closes_at: "21:00", is_active: true },
    { location_id: "loc-1", weekday: 2, opens_at: "07:00", closes_at: "21:00", is_active: true },
    { location_id: "loc-1", weekday: 3, opens_at: "07:00", closes_at: "21:00", is_active: true },
    { location_id: "loc-1", weekday: 4, opens_at: "07:00", closes_at: "21:00", is_active: true },
    { location_id: "loc-1", weekday: 5, opens_at: "07:00", closes_at: "21:00", is_active: true },
    { location_id: "loc-1", weekday: 6, opens_at: "08:00", closes_at: "18:00", is_active: true },
  ]);
  store.set("players", [
    { id: "player-1", org_id: MOCK_ORG_ID, name: "Marco Santos", skill_level: 4.0, status: "active", play_style: "All Court Player" },
    { id: "player-2", org_id: MOCK_ORG_ID, name: "Jenny Lim", skill_level: 3.5, status: "active", play_style: "All Court Player" },
    { id: "player-3", org_id: MOCK_ORG_ID, name: "Rico Dizon", skill_level: 4.0, status: "active", play_style: "All Court Player" },
    { id: "player-4", org_id: MOCK_ORG_ID, name: "Anna Cruz", skill_level: 3.5, status: "active", play_style: "All Court Player" },
  ]);
}

// Seed once
seedStore();

// ── Mock query builder ──
// Tracks filters and returns data from the module-level store.
type Filter = { col: string; op: string; val: unknown };

function queryRows(table: string): Record<string, unknown>[] {
  return store.get(table) ?? [];
}

// Simple filter matcher
function matchesFilter(row: Record<string, unknown>, filter: Filter): boolean {
  const v = row[filter.col];
  switch (filter.op) {
    case "eq": return v === filter.val;
    case "neq": return v !== filter.val;
    case "gt": return typeof v === "number" && typeof filter.val === "number" && v > filter.val;
    case "gte": return typeof v === "number" && typeof filter.val === "number" && v >= filter.val;
    case "lt": return typeof v === "number" && typeof filter.val === "number" && v < filter.val;
    case "lte": return typeof v === "number" && typeof filter.val === "number" && v <= filter.val;
    case "in": return Array.isArray(filter.val) && filter.val.includes(v);
    case "like": return typeof v === "string" && typeof filter.val === "string" && v.includes((filter.val as string).replace(/%/g, ""));
    case "ilike": return typeof v === "string" && typeof filter.val === "string" && v.toLowerCase().includes((filter.val as string).toLowerCase().replace(/%/g, ""));
    default: return true;
  }
}

function createQueryBuilder(table: string, appliedFilters: Filter[] = []) {
  // Early resolve for methods like .then()
  const resolveAll = () => {
    let rows = queryRows(table);
    for (const f of appliedFilters) {
      rows = rows.filter((r) => matchesFilter(r, f));
    }
    return rows;
  };

  const builder: any = {
    select: () => builder,
    insert: (value: unknown) => {
      const rows = store.get(table) ?? [];
      const newRow = { id: crypto.randomUUID(), ...(value as object) };
      rows.push(newRow);
      store.set(table, rows);
      // Return a builder that resolves to the inserted row
      const ib = createQueryBuilder(table, appliedFilters);
      ib.single = async () => ({ data: newRow, error: null });
      ib.select = () => {
        const sb = createQueryBuilder(table, appliedFilters);
        sb.single = async () => ({ data: newRow, error: null });
        return sb;
      };
      return ib;
    },
    update: (value: unknown) => {
      const rows = resolveAll();
      for (const row of rows) {
        Object.assign(row, value);
      }
      return builder;
    },
    delete: () => {
      const rows = store.get(table) ?? [];
      const toDelete = new Set(resolveAll().map((r) => rows.indexOf(r)));
      store.set(table, rows.filter((_, i) => !toDelete.has(i)));
      return builder;
    },
    upsert: (value: unknown) => {
      const rows = store.get(table) ?? [];
      const idx = rows.findIndex((r) => (r as any).id === (value as any).id);
      const existing = rows[idx];
      if (idx >= 0 && existing) {
        Object.assign(existing, value);
      } else {
        rows.push({ id: crypto.randomUUID(), ...(value as object) });
      }
      store.set(table, rows);
      return builder;
    },
    eq: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "eq", val }]),
    neq: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "neq", val }]),
    gt: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "gt", val }]),
    gte: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "gte", val }]),
    lt: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "lt", val }]),
    lte: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "lte", val }]),
    like: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "like", val }]),
    ilike: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "ilike", val }]),
    is: (col: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op: "eq", val }]),
    in: (col: string, vals: unknown[]) => createQueryBuilder(table, [...appliedFilters, { col, op: "in", val: vals }]),
    contains: () => builder,
    filter: (col: string, op: string, val: unknown) => createQueryBuilder(table, [...appliedFilters, { col, op, val }]),
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: async () => ({ data: resolveAll()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: resolveAll()[0] ?? null, error: null }),
    then: (resolve: any) =>
      Promise.resolve({ data: resolveAll(), error: null, count: resolveAll().length }).then(resolve),
  };
  return builder;
}

function createMockClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: { user: MOCK_USER } },
        error: null,
      }),
      getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
      signOut: async () => ({ error: null }),
      // Dev mode never reaches a real identity provider; these exist so the
      // account and admin-signup forms complete instead of throwing.
      updateUser: async () => ({ data: { user: MOCK_USER }, error: null }),
      signUp: async () => ({
        data: { user: MOCK_USER, session: { user: MOCK_USER } },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: { user: MOCK_USER, session: { user: MOCK_USER } },
        error: null,
      }),
      signInWithOAuth: async () => ({
        data: { provider: "google", url: null },
        error: null,
      }),
    },
    from: (table: string) => createQueryBuilder(table),
    rpc: (_fn: string, _args?: Record<string, unknown>) => ({
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
    }),
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: File) => ({ data: { path: _path }, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: `https://mock.storage/${_path}` } }),
      }),
    },
  };
}

export function createClient() {
  if (isDevAuthEnabled()) {
    return createMockClient() as any;
  }
  return (createBrowserClient as any)(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
