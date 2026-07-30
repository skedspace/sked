import { NextResponse } from "next/server";
import { POST as checkout } from "@/lib/platform-subscription-routes/checkout";
import { GET as status } from "@/lib/platform-subscription-routes/status";

// Both endpoints are dispatched from a single route so they bundle into one
// Vercel Function. The public URLs are unchanged.

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  return action === "status" ? status(request) : notFound();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  return action === "checkout" ? checkout(request) : notFound();
}
