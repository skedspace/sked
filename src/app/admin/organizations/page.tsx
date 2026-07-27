import { createAdminClient } from "@/lib/supabase/admin";
import { AdminOrgList } from "./admin-org-list";

export const dynamic = "force-dynamic";

export default async function AdminOrganizations() {
  const supabase = createAdminClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, created_at, subdomain")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          All registered businesses on the platform.
        </p>
      </div>
      <AdminOrgList orgs={orgs ?? []} />
    </div>
  );
}
