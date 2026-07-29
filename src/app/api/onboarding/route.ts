import { createClient } from "@/lib/supabase/server";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { NextResponse } from "next/server";

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

    if (!orgName || !slug) {
      return NextResponse.json(
        { error: "Business name and page link are required" },
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
      return NextResponse.json({
        org_id: "00000000-0000-0000-0000-000000000001",
      });
    }

    // ── Production: create real records (admin client bypasses RLS) ──

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // 1. Create the organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: orgName, slug })
      .select("id")
      .single();

    if (orgError) throw orgError;

    // 2. Add the user as owner
    const { error: memberError } = await admin
      .from("org_members")
      .insert({ org_id: org.id, user_id: userId, role: "owner" });

    if (memberError) throw memberError;

    // 3. Create default location
    const { error: locError } = await admin
      .from("locations")
      .insert({
        org_id: org.id,
        name: locationName || orgName,
        timezone: "Asia/Manila",
      });

    if (locError) throw locError;

    // 4. Create default page
    const { error: pageError } = await admin
      .from("pages")
      .insert({ org_id: org.id, bio: `Welcome to ${orgName}!` });

    if (pageError) throw pageError;

    return NextResponse.json({ org_id: org.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong";
    console.error("[POST /api/onboarding]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
