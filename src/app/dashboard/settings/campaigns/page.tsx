import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignsList } from "./campaigns-list";

export default async function CampaignsPage() {
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

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns & Raffles</h1>
        <p className="text-muted-foreground">
          Run giveaways and promotions to attract more customers.
        </p>
      </div>
      <CampaignsList
        campaigns={(campaigns ?? []) as any[]}
        orgId={membership.org_id}
        isOwner={membership.role === "owner"}
      />
    </div>
  );
}
