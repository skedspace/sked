import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutStatusView } from "./status-view";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id: checkoutId } = await searchParams;
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/checkout/success?checkout_id=${checkoutId ?? ""}`)}`);
  if (!checkoutId) redirect("/pricing");
  return <CheckoutStatusView checkoutId={checkoutId} />;
}
