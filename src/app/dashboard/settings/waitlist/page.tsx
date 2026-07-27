import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WaitlistView } from "./waitlist-view";

export default async function WaitlistPage() {
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

  const { data: entries } = await supabase
    .from("waitlist_entries")
    .select("*, services(name), resources(name)")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waitlist</h1>
        <p className="text-muted-foreground">
          Customers waiting for a slot to open up.
        </p>
      </div>
      <WaitlistView
        entries={(entries ?? []) as any[]}
        isOwner={membership.role === "owner"}
      />
    </div>
  );
}
