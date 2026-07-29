import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BoardSettings } from "@/components/board/board-settings";

export const dynamic = "force-dynamic";

export default async function BoardSettingsPage() {
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

  const { data: organization } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .single();

  return (
    <BoardSettings
      orgId={membership.org_id}
      orgSlug={organization?.slug ?? membership.org_id}
    />
  );
}
