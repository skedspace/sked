import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── POST: Create a share token ── */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, orgSlug, sessionId } = body;

    if (!orgId || !sessionId) {
      return NextResponse.json(
        { error: "orgId and sessionId are required" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Generate a unique token
    const token = crypto.randomUUID();
    const origin = new URL(request.url).origin;

    // Persist to DB
    const { data, error } = await supabase
      .from("share_tokens")
      .insert({
        org_id: orgId,
        session_id: sessionId,
        token,
      })
      .select("token, session_id, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to create share token" },
        { status: 500 },
      );
    }

    const shareUrl = `${origin}/board/${orgSlug ?? orgId}/session/${sessionId}?token=${token}`;

    return NextResponse.json({
      token: data.token,
      shareUrl,
      createdAt: data.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

/* ── GET: Look up a share token ── */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "token query parameter is required" },
      { status: 400 },
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("share_tokens")
    .select("org_id, session_id, created_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Token not found or expired" },
      { status: 404 },
    );
  }

  // Check expiration
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Token has expired" },
      { status: 410 },
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", data.org_id)
    .maybeSingle();

  return NextResponse.json({
    orgId: data.org_id,
    orgSlug: organization?.slug ?? data.org_id,
    sessionId: data.session_id,
    createdAt: data.created_at,
  });
}
