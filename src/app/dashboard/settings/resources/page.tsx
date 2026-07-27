import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResourcesList } from "./resources-list";
import { AddResourceDialog } from "./add-resource-dialog";

export default async function ResourcesPage() {
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

  const { data: resources } = await supabase
    .from("resources")
    .select("*, locations(name)")
    .eq("org_id", membership.org_id)
    .order("name");

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("org_id", membership.org_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resources</h1>
          <p className="text-muted-foreground">
            Courts, rooms, stations — the things customers book.
          </p>
        </div>
        <AddResourceDialog orgId={membership.org_id} locations={locations ?? []} />
      </div>
      <ResourcesList resources={resources ?? []} />
    </div>
  );
}
