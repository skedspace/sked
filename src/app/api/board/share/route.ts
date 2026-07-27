import { NextResponse } from "next/server";
import crypto from "node:crypto";

/* ── In-memory token store (replace with DB in production) ── */

const tokenStore = new Map<string, { orgId: string; sessionId: string; createdAt: string }>();

/* ── POST: Create a share token ── */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, sessionId } = body;

    if (!orgId || !sessionId) {
      return NextResponse.json(
        { error: "orgId and sessionId are required" },
        { status: 400 },
      );
    }

    // Generate a unique token
    const token = crypto.randomUUID();
    const origin = new URL(request.url).origin;

    tokenStore.set(token, {
      orgId,
      sessionId,
      createdAt: new Date().toISOString(),
    });

    const shareUrl = `${origin}/board/${orgId}/session/${sessionId}?token=${token}`;

    return NextResponse.json({
      token,
      shareUrl,
      createdAt: tokenStore.get(token)!.createdAt,
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

  const data = tokenStore.get(token);
  if (!data) {
    return NextResponse.json(
      { error: "Token not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
