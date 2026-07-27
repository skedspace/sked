import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicesList } from "./services-list";
import { AddServiceDialog } from "./add-service-dialog";

export default async function ServicesPage() {
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

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("org_id", membership.org_id)
    .order("name");

  const { data: resources } = await supabase
    .from("resources")
    .select("id, name")
    .eq("org_id", membership.org_id)
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            What customers book — duration, price, and availability settings.
          </p>
        </div>
        <AddServiceDialog
          orgId={membership.org_id}
          resources={resources ?? []}
        />
      </div>
      <ServicesList services={services ?? []} />
    </div>
  );
}
