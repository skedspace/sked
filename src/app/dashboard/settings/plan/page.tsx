import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanManagement } from "./plan-management";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";

export default async function PlanPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .single();

  if (!membership) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan")
    .eq("id", membership.org_id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: usage } = await supabase
    .from("monthly_usage")
    .select("bookings_count")
    .eq("org_id", membership.org_id)
    .eq("month", new Date().toISOString().slice(0, 7) + "-01")
    .maybeSingle();

  // Fetch admin-configured monthly price
  const { data: priceConfig } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "monthly_price_cents")
    .maybeSingle();

  const monthlyPriceCents = priceConfig?.value
    ? Number(priceConfig.value)
    : DEFAULT_MONTHLY_PRICE_CENTS;

  return (
    <PlanManagement
      orgId={membership.org_id}
      isOwner={membership.role === "owner"}
      currentPlan={org?.plan ?? "trial"}
      subscription={subscription ?? null}
      usageCount={usage?.bookings_count ?? 0}
      monthlyPriceCents={monthlyPriceCents}
    />
  );
}
