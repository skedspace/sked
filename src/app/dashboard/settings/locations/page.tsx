import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LocationsList } from "./locations-list";
import { AddLocationDialog } from "./add-location-dialog";

export default async function LocationsPage() {
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

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("org_id", membership.org_id)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground">Manage your business venues.</p>
        </div>
        <AddLocationDialog orgId={membership.org_id} />
      </div>
      <LocationsList locations={locations ?? []} />
    </div>
  );
}
