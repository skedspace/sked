import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCheckout } from "@/lib/platform-subscriptions";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = isDevAuthEnabled()
    ? { org_id: "00000000-0000-0000-0000-000000000001" }
    : (await supabase.from("org_members")
        .select("org_id").eq("user_id", session.user.id).limit(1).maybeSingle()).data;
  const id = new URL(request.url).searchParams.get("checkout_id");
  if (!id || !membership?.org_id) return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  const checkout = await getCheckout(id, membership.org_id);
  if (!checkout) return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  return NextResponse.json({
    id: checkout.id,
    status: checkout.status,
    amountCents: checkout.amount_cents,
    termMonths: checkout.billing_term_months,
    paidAt: checkout.paid_at,
  });
}
