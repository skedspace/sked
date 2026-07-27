import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { CustomerDetail } from "./customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", session.user.id)
    .single();

  if (!membership) redirect("/onboarding");

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .single();

  if (!customer) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(name), resources(name)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <CustomerDetail
      customer={customer}
      bookings={bookings ?? []}
    />
  );
}
