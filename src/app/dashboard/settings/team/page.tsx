import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamManagement } from "./team-management";

export default async function TeamPage() {
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

  // Fetch members with user info
  const { data: members } = await supabase
    .from("org_members")
    .select(`
      user_id,
      role,
      created_at
    `)
    .eq("org_id", membership.org_id);

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.org_id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground">
          Manage staff accounts for {org?.name ?? "your organization"}.
        </p>
      </div>
      <TeamManagement
        members={(members ?? []) as any[]}
        orgId={membership.org_id}
        isOwner={membership.role === "owner"}
        currentUserId={session.user.id}
      />
    </div>
  );
}
