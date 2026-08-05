/**
 * RLS (Row-Level Security) Test Suite
 *
 * Verifies tenant isolation against a real local Supabase instance. Every test
 * runs as an actual signed-in user (anon key + user JWT), so the assertions
 * exercise the same policy evaluation path the app hits in production.
 *
 * The service-role client is used ONLY to seed and tear down fixtures — it
 * bypasses RLS by design and is never the subject of an assertion.
 *
 * Prerequisites:
 *   - supabase start (local Supabase running)
 *   - Migrations applied (supabase db push / supabase db reset)
 *   - .env.local populated (loaded by vitest.rls.config.ts)
 *
 * Fixtures are namespaced per run and removed in afterAll, so the suite is safe
 * to run repeatedly against a database that already has data in it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TEST_PASSWORD = "rls-suite-pw-9f3a2c7b";

if (!ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "The RLS suite needs NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. " +
      "Run `supabase start` and make sure .env.local is populated.",
  );
}

/** Bypasses RLS. Seeding and teardown only. */
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedInAs(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`could not create ${email}: ${error?.message ?? "no user returned"}`);
  }
  return data.user.id;
}

async function seedRow(table: string, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from(table).insert(row).select("id").single();
  if (error || !data) {
    throw new Error(`seeding ${table} failed: ${error?.message ?? "no row returned"}`);
  }
  return (data as { id: string }).id;
}

type Org = {
  id: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  staffId: string;
  staffEmail: string;
  locationId: string;
  resourceId: string;
  serviceId: string;
  customerId: string;
  bookingId: string;
  paymentId: string;
};

/** Namespaces this run's fixtures so parallel/repeat runs never collide. */
const RUN = `rls${Date.now().toString(36)}`;

async function seedOrg(label: string, dayOffset: number): Promise<Org> {
  const slug = `${RUN}-${label}`;
  const orgId = await seedRow("organizations", { name: `RLS Org ${label}`, slug });

  const ownerEmail = `${slug}-owner@example.test`;
  const staffEmail = `${slug}-staff@example.test`;
  const ownerId = await createUser(ownerEmail);
  const staffId = await createUser(staffEmail);

  const { error: memberErr } = await admin.from("org_members").insert([
    { org_id: orgId, user_id: ownerId, role: "owner" },
    { org_id: orgId, user_id: staffId, role: "staff" },
  ]);
  if (memberErr) throw new Error(`seeding org_members failed: ${memberErr.message}`);

  const locationId = await seedRow("locations", {
    org_id: orgId,
    name: `${label} Main Venue`,
    timezone: "Asia/Manila",
  });
  const resourceId = await seedRow("resources", {
    org_id: orgId,
    location_id: locationId,
    name: `${label} Court 1`,
  });
  const serviceId = await seedRow("services", {
    org_id: orgId,
    name: `${label} Court Rental`,
    duration_min: 60,
    price_cents: 35000,
  });
  const customerId = await seedRow("customers", {
    org_id: orgId,
    name: `${label} Customer`,
    email: `${slug}-customer@example.test`,
    phone: "+639170000000",
  });

  // Distinct day per org keeps the exclusion constraint out of the picture.
  const start = new Date(Date.now() + dayOffset * 86_400_000);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 3_600_000);
  const bookingId = await seedRow("bookings", {
    org_id: orgId,
    resource_id: resourceId,
    service_id: serviceId,
    customer_id: customerId,
    time_range: `[${start.toISOString()},${end.toISOString()})`,
    status: "confirmed",
    price_cents: 35000,
    source: "manual",
  });

  const paymentId = await seedRow("payments", {
    booking_id: bookingId,
    provider: "test",
    provider_ref: `${slug}-payment-ref`,
    type: "full",
    amount_cents: 35000,
    status: "succeeded",
  });

  const { error: pageErr } = await admin.from("pages").insert({
    org_id: orgId,
    theme: "default",
    bio: `${label} bio`,
    is_published: true,
  });
  if (pageErr) throw new Error(`seeding pages failed: ${pageErr.message}`);

  return {
    id: orgId,
    slug,
    ownerId,
    ownerEmail,
    staffId,
    staffEmail,
    locationId,
    resourceId,
    serviceId,
    customerId,
    bookingId,
    paymentId,
  };
}

async function destroyOrg(org: Org | undefined) {
  if (!org) return;
  // payments -> bookings has no ON DELETE CASCADE, so it must go first.
  await admin.from("payments").delete().eq("id", org.paymentId);
  await admin.from("organizations").delete().eq("id", org.id);
  await admin.auth.admin.deleteUser(org.ownerId);
  await admin.auth.admin.deleteUser(org.staffId);
}

let orgA: Org;
let orgB: Org;
let ownerA: SupabaseClient;
let staffA: SupabaseClient;
let ownerB: SupabaseClient;

beforeAll(async () => {
  orgA = await seedOrg("alpha", 1);
  orgB = await seedOrg("bravo", 2);
  ownerA = await signedInAs(orgA.ownerEmail);
  staffA = await signedInAs(orgA.staffEmail);
  ownerB = await signedInAs(orgB.ownerEmail);
});

afterAll(async () => {
  await destroyOrg(orgA);
  await destroyOrg(orgB);
});

describe("RLS: Tenant Isolation", () => {
  it("scopes locations to the caller's org", async () => {
    const { data, error } = await ownerA.from("locations").select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id);
    expect(ids).toContain(orgA.locationId);
    expect(ids).not.toContain(orgB.locationId);
    expect((data ?? []).every((row) => row.org_id === orgA.id)).toBe(true);
  });

  it("prevents cross-org data leakage via booking queries", async () => {
    const { data, error } = await ownerA.from("bookings").select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id);
    expect(ids).toContain(orgA.bookingId);
    expect(ids).not.toContain(orgB.bookingId);
    expect((data ?? []).every((row) => row.org_id === orgA.id)).toBe(true);
  });

  it("scopes resources and services to the caller's org", async () => {
    const { data: resources } = await ownerA.from("resources").select("id, org_id");
    const { data: services } = await ownerA.from("services").select("id, org_id");
    expect((resources ?? []).map((r) => r.id)).not.toContain(orgB.resourceId);
    expect((services ?? []).map((s) => s.id)).not.toContain(orgB.serviceId);
  });

  it("scopes customer records to the caller's org", async () => {
    const { data, error } = await ownerA.from("customers").select("id, org_id, email");
    expect(error).toBeNull();
    expect((data ?? []).map((row) => row.id)).not.toContain(orgB.customerId);
    expect((data ?? []).every((row) => row.org_id === orgA.id)).toBe(true);
  });

  it("refuses a direct fetch of another org's booking by id", async () => {
    const { data, error } = await ownerA
      .from("bookings")
      .select("id")
      .eq("id", orgB.bookingId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks writing a row into another org", async () => {
    const { error } = await ownerA
      .from("locations")
      .insert({ org_id: orgB.id, name: "intruder venue" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("blocks updating another org's record", async () => {
    const { data, error } = await ownerA
      .from("organizations")
      .update({ name: "hijacked" })
      .eq("id", orgB.id)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgB.id)
      .single();
    expect(check?.name).not.toBe("hijacked");
  });

  it("blocks deleting another org's record", async () => {
    const { error } = await ownerB.from("locations").delete().eq("id", orgA.locationId);
    expect(error).toBeNull();

    const { data: check } = await admin
      .from("locations")
      .select("id")
      .eq("id", orgA.locationId);
    expect(check ?? []).toHaveLength(1);
  });
});

describe("RLS: Role Enforcement", () => {
  it("allows owners to update their own org settings", async () => {
    const { data, error } = await ownerA
      .from("organizations")
      .update({ contact_phone: "+639171234567" })
      .eq("id", orgA.id)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it("prevents staff from updating org settings", async () => {
    const { data, error } = await staffA
      .from("organizations")
      .update({ name: "staff renamed this" })
      .eq("id", orgA.id)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgA.id)
      .single();
    expect(check?.name).not.toBe("staff renamed this");
  });

  it("prevents staff from reading payments", async () => {
    const { data, error } = await staffA.from("payments").select("id, amount_cents");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("allows owners to read their own org's payments", async () => {
    const { data, error } = await ownerA.from("payments").select("id");
    expect(error).toBeNull();
    expect((data ?? []).map((row) => row.id)).toContain(orgA.paymentId);
  });

  it("prevents owners from reading another org's payments", async () => {
    const { data } = await ownerA.from("payments").select("id");
    expect((data ?? []).map((row) => row.id)).not.toContain(orgB.paymentId);
  });
});

describe("RLS: Public Access (SECURITY DEFINER)", () => {
  const PUBLIC_PAGE_COLUMNS = [
    "org_id",
    "org_name",
    "org_slug",
    "bio",
    "cover_url",
    "logo_url",
    "socials",
    "sections",
    "theme",
    "primary_color",
    "services",
    "is_published",
    "plan",
  ];

  it("exposes only whitelisted columns via get_public_page", async () => {
    const { data, error } = await anonClient().rpc("get_public_page", {
      page_slug: orgA.slug,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const row = (data as Record<string, unknown>[])[0]!;
    expect(Object.keys(row).sort()).toEqual([...PUBLIC_PAGE_COLUMNS].sort());
    // Contact details live on organizations and must never surface publicly.
    expect(row).not.toHaveProperty("contact_email");
    expect(row).not.toHaveProperty("contact_phone");
    expect(row).not.toHaveProperty("deleted_at");
  });

  it("returns nothing for a non-existent slug", async () => {
    const { data, error } = await anonClient().rpc("get_public_page", {
      page_slug: `${RUN}-does-not-exist`,
    });
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("only returns services belonging to the requested org", async () => {
    const { data } = await anonClient().rpc("get_public_page", {
      page_slug: orgA.slug,
    });
    const row = (data as Record<string, unknown>[])[0]!;
    const services = (row.services ?? []) as { id: string }[];
    expect(services.map((s) => s.id)).not.toContain(orgB.serviceId);
  });
});

describe("RLS: Public Booking Path (migration 00044)", () => {
  it("resolves an existing customer by email without exposing the row", async () => {
    const { data, error } = await anonClient().rpc("find_or_create_customer", {
      p_org_id: orgA.id,
      p_name: "Ignored When Matched",
      p_email: `${orgA.slug}-customer@example.test`,
      p_phone: null,
    });
    expect(error).toBeNull();
    // Returns a bare UUID — never a customer row.
    expect(data).toBe(orgA.customerId);
    expect(typeof data).toBe("string");
  });

  it("creates a customer when nothing matches, and is stable on re-call", async () => {
    const email = `${RUN}-brand-new@example.test`;
    const first = await anonClient().rpc("find_or_create_customer", {
      p_org_id: orgA.id,
      p_name: "Brand New",
      p_email: email,
      p_phone: null,
    });
    expect(first.error).toBeNull();
    expect(first.data).toBeTruthy();

    const second = await anonClient().rpc("find_or_create_customer", {
      p_org_id: orgA.id,
      p_name: "Brand New",
      p_email: email,
      p_phone: null,
    });
    expect(second.data).toBe(first.data);

    // Created in the requested org, not leaked anywhere else.
    const { data: row } = await admin
      .from("customers")
      .select("org_id")
      .eq("id", first.data as string)
      .single();
    expect(row?.org_id).toBe(orgA.id);
  });

  it("refuses to resolve customers for an org that is not publicly bookable", async () => {
    await admin.from("pages").update({ is_published: false }).eq("org_id", orgB.id);
    try {
      const { error } = await anonClient().rpc("find_or_create_customer", {
        p_org_id: orgB.id,
        p_name: "Should Not Land",
        p_email: `${RUN}-blocked@example.test`,
        p_phone: null,
      });
      expect(error).not.toBeNull();
    } finally {
      await admin.from("pages").update({ is_published: true }).eq("org_id", orgB.id);
    }
  });

  it("blocks anonymous direct inserts into bookings entirely", async () => {
    const start = new Date(Date.now() + 30 * 86_400_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);

    // 00045 removed the anon INSERT policy — the RPC is the only public path.
    const { error } = await anonClient().from("bookings").insert({
      org_id: orgA.id,
      resource_id: orgA.resourceId,
      service_id: orgA.serviceId,
      customer_id: orgA.customerId,
      time_range: `[${start.toISOString()},${end.toISOString()})`,
      status: "confirmed",
      price_cents: 35000,
      source: "public",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });
});

describe("RLS: create_public_booking (migration 00045)", () => {
  const bookedIds: string[] = [];

  function slotAt(dayOffset: number) {
    const start = new Date(Date.now() + dayOffset * 86_400_000);
    start.setUTCMinutes(0, 0, 0);
    return {
      start: start.toISOString(),
      end: new Date(start.getTime() + 3_600_000).toISOString(),
    };
  }

  async function book(
    client: SupabaseClient,
    org: Org,
    dayOffset: number,
    key: string,
    overrides: Record<string, unknown> = {},
  ) {
    const { start, end } = slotAt(dayOffset);
    return client.rpc("create_public_booking", {
      p_org_id: org.id,
      p_resource_id: org.resourceId,
      p_service_id: org.serviceId,
      p_customer_id: org.customerId,
      p_start: start,
      p_end: end,
      p_price_cents: 35000,
      p_idempotency_key: key,
      p_customer_name: "Public Booker",
      p_customer_email: null,
      p_customer_phone: null,
      ...overrides,
    });
  }

  afterAll(async () => {
    for (const id of bookedIds) {
      await admin.from("payments").delete().eq("booking_id", id);
      await admin.from("bookings").delete().eq("id", id);
    }
  });

  it("creates a booking anonymously and returns its id", async () => {
    const { data, error } = await book(anonClient(), orgA, 40, `${RUN}-ok`);
    expect(error).toBeNull();
    expect(typeof data).toBe("string");
    bookedIds.push(data as string);

    const { data: row } = await admin
      .from("bookings")
      .select("org_id, source, status")
      .eq("id", data as string)
      .single();
    expect(row?.org_id).toBe(orgA.id);
    expect(row?.source).toBe("public");
  });

  it("links the customer to a player record", async () => {
    const { data: player } = await admin
      .from("players")
      .select("id, org_id")
      .eq("customer_id", orgA.customerId)
      .maybeSingle();
    expect(player?.org_id).toBe(orgA.id);
  });

  it("is idempotent — the same key returns the same booking", async () => {
    const key = `${RUN}-idem`;
    const first = await book(anonClient(), orgA, 41, key);
    expect(first.error).toBeNull();
    bookedIds.push(first.data as string);

    const second = await book(anonClient(), orgA, 41, key);
    expect(second.error).toBeNull();
    expect(second.data).toBe(first.data);
  });

  it("reports a taken slot with a distinguishable SLOT_TAKEN error", async () => {
    const held = await book(anonClient(), orgA, 42, `${RUN}-hold`);
    expect(held.error).toBeNull();
    bookedIds.push(held.data as string);

    // Same resource, same window, different idempotency key.
    const clash = await book(anonClient(), orgA, 42, `${RUN}-clash`);
    expect(clash.error).not.toBeNull();
    expect(clash.error?.message).toContain("SLOT_TAKEN");
  });

  it("rejects a resource belonging to another org", async () => {
    const { error } = await book(anonClient(), orgA, 43, `${RUN}-xorg`, {
      p_resource_id: orgB.resourceId,
    });
    expect(error).not.toBeNull();
    expect(error?.message).not.toContain("SLOT_TAKEN");
  });

  it("rejects a customer belonging to another org", async () => {
    const { error } = await book(anonClient(), orgA, 44, `${RUN}-xcust`, {
      p_customer_id: orgB.customerId,
    });
    expect(error).not.toBeNull();
  });

  it("rejects an org that is not publicly bookable", async () => {
    await admin.from("pages").update({ is_published: false }).eq("org_id", orgB.id);
    try {
      const { error } = await book(anonClient(), orgB, 45, `${RUN}-unpub`);
      expect(error).not.toBeNull();
    } finally {
      await admin.from("pages").update({ is_published: true }).eq("org_id", orgB.id);
    }
  });

  it("rejects an end time that is not after the start", async () => {
    const { start } = slotAt(46);
    const { error } = await book(anonClient(), orgA, 46, `${RUN}-badrange`, {
      p_end: start,
    });
    expect(error).not.toBeNull();
  });

  it("still does not let the booker read the row back", async () => {
    const anon = anonClient();
    const { data, error } = await book(anon, orgA, 47, `${RUN}-noread`);
    expect(error).toBeNull();
    bookedIds.push(data as string);

    const { data: rows } = await anon
      .from("bookings")
      .select("id")
      .eq("id", data as string);
    expect(rows ?? []).toHaveLength(0);
  });
});

describe("RLS: Public Review Submission (migration 00046)", () => {
  // A review needs a finished booking, so seed one in the past.
  let pastBookingId: string;
  let pastDate: string;
  const createdReviewIds: string[] = [];

  beforeAll(async () => {
    const start = new Date(Date.now() - 3 * 86_400_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);
    pastDate = start.toISOString().slice(0, 10);

    pastBookingId = await seedRow("bookings", {
      org_id: orgA.id,
      resource_id: orgA.resourceId,
      service_id: orgA.serviceId,
      customer_id: orgA.customerId,
      time_range: `[${start.toISOString()},${end.toISOString()})`,
      status: "completed",
      price_cents: 35000,
      source: "public",
      idempotency_key: `${RUN}-past`,
    });
  });

  afterAll(async () => {
    for (const id of createdReviewIds) {
      await admin.from("reviews").delete().eq("id", id);
    }
    await admin.from("reviews").delete().eq("booking_id", pastBookingId);
    await admin.from("bookings").delete().eq("id", pastBookingId);
  });

  function submit(overrides: Record<string, unknown> = {}) {
    return anonClient().rpc("submit_public_review", {
      p_org_slug: orgA.slug,
      p_contact: `${orgA.slug}-customer@example.test`,
      p_booking_date: pastDate,
      p_rating: 5,
      p_title: "Great courts",
      p_body: "Clean nets and easy booking.",
      ...overrides,
    });
  }

  it("accepts a review from someone who actually booked", async () => {
    const { data, error } = await submit();
    expect(error).toBeNull();
    expect(typeof data).toBe("string");
    createdReviewIds.push(data as string);

    const { data: row } = await admin
      .from("reviews")
      .select("org_id, booking_id, status, rating, source")
      .eq("id", data as string)
      .single();
    expect(row?.org_id).toBe(orgA.id);
    expect(row?.booking_id).toBe(pastBookingId);
    expect(row?.rating).toBe(5);
    // Never auto-published — the owner moderates.
    expect(row?.status).toBe("pending");
  });

  it("rejects a second review for the same booking", async () => {
    const { error } = await submit({ p_title: "Again", p_body: "Second try." });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("REVIEW_ALREADY_SUBMITTED");
  });

  it("rejects a contact that never booked", async () => {
    const { error } = await submit({ p_contact: `${RUN}-stranger@example.test` });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("REVIEW_NO_MATCH");
  });

  it("rejects the right contact on the wrong date", async () => {
    const { error } = await submit({ p_booking_date: "2020-01-01" });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("REVIEW_NO_MATCH");
  });

  it("does not leak which half of the lookup failed", async () => {
    const wrongContact = await submit({ p_contact: `${RUN}-nobody@example.test` });
    const wrongDate = await submit({ p_booking_date: "2019-05-05" });
    expect(wrongContact.error?.message).toBe(wrongDate.error?.message);
  });

  it("rejects a review aimed at another org's slug", async () => {
    const { error } = await submit({ p_org_slug: orgB.slug });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("REVIEW_NO_MATCH");
  });

  it("rejects an out-of-range rating", async () => {
    const { error } = await submit({ p_rating: 6 });
    expect(error).not.toBeNull();
  });

  it("rejects an empty title or body", async () => {
    const noTitle = await submit({ p_title: "   " });
    expect(noTitle.error).not.toBeNull();
    const noBody = await submit({ p_body: "" });
    expect(noBody.error).not.toBeNull();
  });

  it("will not accept a review for a cancelled booking", async () => {
    const start = new Date(Date.now() - 4 * 86_400_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);
    const cancelledId = await seedRow("bookings", {
      org_id: orgA.id,
      resource_id: orgA.resourceId,
      service_id: orgA.serviceId,
      customer_id: orgA.customerId,
      time_range: `[${start.toISOString()},${end.toISOString()})`,
      status: "cancelled",
      price_cents: 35000,
      source: "public",
      idempotency_key: `${RUN}-cancelled`,
    });

    const { error } = await submit({
      p_booking_date: start.toISOString().slice(0, 10),
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("REVIEW_NO_MATCH");

    await admin.from("bookings").delete().eq("id", cancelledId);
  });

  it("matches on phone too, ignoring formatting", async () => {
    // Fixture phone is +639170000000; submit it punctuated differently.
    const start = new Date(Date.now() - 5 * 86_400_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);
    const bookingId = await seedRow("bookings", {
      org_id: orgA.id,
      resource_id: orgA.resourceId,
      service_id: orgA.serviceId,
      customer_id: orgA.customerId,
      time_range: `[${start.toISOString()},${end.toISOString()})`,
      status: "confirmed",
      price_cents: 35000,
      source: "public",
      idempotency_key: `${RUN}-phone`,
    });

    const { data, error } = await submit({
      p_contact: "+63 917 000 0000",
      p_booking_date: start.toISOString().slice(0, 10),
      p_title: "Booked by phone",
      p_body: "Found the slot easily.",
    });
    expect(error).toBeNull();
    createdReviewIds.push(data as string);

    await admin.from("reviews").delete().eq("booking_id", bookingId);
    await admin.from("bookings").delete().eq("id", bookingId);
  });

  it("does not treat an empty contact as a phone match", async () => {
    const { error } = await submit({ p_contact: "   " });
    expect(error).not.toBeNull();
  });

  it("keeps reviews unreadable by anonymous callers", async () => {
    const { data } = await anonClient().from("reviews").select("id, title, body");
    expect(data ?? []).toHaveLength(0);
  });

  it("lets the owner see the pending review for moderation", async () => {
    const { data, error } = await ownerA
      .from("reviews")
      .select("id, status")
      .eq("booking_id", pastBookingId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("does not expose the review to another org's owner", async () => {
    const { data } = await ownerB
      .from("reviews")
      .select("id")
      .eq("booking_id", pastBookingId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe("RLS: Anonymous Direct Table Access", () => {
  it("blocks anonymous reads of organizations", async () => {
    const { data } = await anonClient().from("organizations").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks anonymous reads of bookings", async () => {
    const { data } = await anonClient().from("bookings").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks anonymous reads of payments", async () => {
    const { data } = await anonClient().from("payments").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks anonymous reads of customer PII", async () => {
    const { data } = await anonClient().from("customers").select("id, name, email, phone");
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks anonymous reads of org membership", async () => {
    const { data } = await anonClient().from("org_members").select("user_id");
    expect(data ?? []).toHaveLength(0);
  });
});
