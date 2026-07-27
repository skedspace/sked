import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanManagement } from "./plan-management";

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
    .maybeSingle();

  const { data: usage } = await supabase
    .from("monthly_usage")
    .select("bookings_count")
    .eq("org_id", membership.org_id)
    .eq("month", new Date().toISOString().slice(0, 7) + "-01")
    .maybeSingle();

  return (
    <PlanManagement
      orgId={membership.org_id}
      isOwner={membership.role === "owner"}
      currentPlan={org?.plan ?? "free"}
      subscription={subscription ?? null}
      usageCount={usage?.bookings_count ?? 0}
    />
  );
}
