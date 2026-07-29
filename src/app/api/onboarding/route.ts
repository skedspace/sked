import { createClient } from "@/lib/supabase/server";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { NextResponse } from "next/server";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "blog",
  "dashboard",
  "embed",
  "help",
  "login",
  "onboarding",
  "pricing",
  "privacy",
  "signup",
  "support",
  "terms",
  "www",
]);

function isValidSlug(slug: string) {
  return (
    slug.length >= 3 &&
    slug.length <= 48 &&
    SLUG_PATTERN.test(slug) &&
    !RESERVED_SLUGS.has(slug)
  );
}

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams
      .get("slug")
      ?.trim()
      .toLowerCase();

    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ available: false });
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isDevAuthEnabled()) {
      return NextResponse.json({
        available: slug !== "marco-pickleball",
        checkedPath: `/p/${slug}`,
      });
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // /p/[slug] resolves from the organization slug, so this is the
    // canonical availability check for both /p/name and name.sked.space.
    const { data: organization, error } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      available: !organization,
      checkedPath: `/p/${slug}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not check availability";
    console.error("[GET /api/onboarding]", message);
    return NextResponse.json(
      { error: "Could not check availability" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/onboarding
 *
 * Creates an organization, membership, default location, and public page
 * for a newly signed-up user. Runs server-side so it works with the
 * mocked Supabase client in dev mode.
 *
 * In production it uses the admin (service_role) client to bypass RLS
 * since newly-created users cannot have row-level policies yet.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgName, slug, locationName } = body as {
      orgName: string;
      slug: string;
      locationName?: string;
    };
    const normalizedName = orgName?.trim();
    const normalizedSlug = slug?.trim().toLowerCase();
    const normalizedLocation = locationName?.trim();

    if (!normalizedName || !normalizedSlug) {
      return NextResponse.json(
        { error: "Business name and page link are required" },
        { status: 400 },
      );
    }

    if (normalizedName.length > 100) {
      return NextResponse.json(
        { error: "Business name must be 100 characters or fewer" },
        { status: 400 },
      );
    }

    if (!isValidSlug(normalizedSlug)) {
      return NextResponse.json(
        { error: "Choose a valid business page address" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Verify the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // In dev mode the server client is mocked — simulate success
    // so developers can test the onboarding flow without a real database.
    if (isDevAuthEnabled()) {
      if (normalizedSlug === "marco-pickleball") {
        return NextResponse.json(
          { error: "That business page is already taken" },
          { status: 409 },
        );
      }
      return NextResponse.json({
        org_id: "00000000-0000-0000-0000-000000000001",
      });
    }

    // ── Production: create real records (admin client bypasses RLS) ──

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: existingOrg, error: availabilityError } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (availabilityError) throw availabilityError;
    if (existingOrg) {
      return NextResponse.json(
        { error: "That business page is already taken" },
        { status: 409 },
      );
    }

    // 1. Create the organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: normalizedName, slug: normalizedSlug })
      .select("id")
      .single();

    if (orgError?.code === "23505") {
      return NextResponse.json(
        { error: "That business page is already taken" },
        { status: 409 },
      );
    }
    if (orgError) throw orgError;

    // 2. Add the user as owner
    const { error: memberError } = await admin
      .from("org_members")
      .insert({ org_id: org.id, user_id: userId, role: "owner" });

    if (memberError) throw memberError;

    // 3. Create default location
    const { error: locError } = await admin.from("locations").insert({
      org_id: org.id,
      name: normalizedLocation || normalizedName,
      timezone: "Asia/Manila",
    });

    if (locError) throw locError;

    // 4. Create default page
    const { error: pageError } = await admin
      .from("pages")
      .insert({ org_id: org.id, bio: `Welcome to ${normalizedName}!` });

    if (pageError) throw pageError;

    return NextResponse.json({ org_id: org.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    console.error("[POST /api/onboarding]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
