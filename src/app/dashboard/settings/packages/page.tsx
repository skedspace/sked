import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PackagesList } from "./packages-list";

export default async function PackagesPage() {
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

  const { data: packages } = await supabase
    .from("packages")
    .select("*, services(name)")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Packages</h1>
          <p className="text-muted-foreground">
            Prepaid session bundles customers can purchase.
          </p>
        </div>
      </div>
      <PackagesList
        packages={(packages ?? []) as any[]}
        orgId={membership.org_id}
        isOwner={membership.role === "owner"}
      />
    </div>
  );
}
