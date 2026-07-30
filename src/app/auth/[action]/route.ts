import { NextResponse } from "next/server";
import { GET as callback } from "@/lib/auth-routes/callback";
import { POST as signout } from "@/lib/auth-routes/signout";

// Auth endpoints are dispatched from a single route so they bundle into one
// Vercel Function. The public URLs (/auth/callback, /auth/signout) are unchanged.

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  return action === "callback" ? callback(request) : notFound();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  return action === "signout" ? signout(request) : notFound();
}
