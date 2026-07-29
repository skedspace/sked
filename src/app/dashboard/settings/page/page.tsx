import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageEditor } from "./page-editor";

export default async function PageSettings() {
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

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("org_id", membership.org_id)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug, name, logo_url")
    .eq("id", membership.org_id)
    .single();

  return (
    <PageEditor
      orgId={membership.org_id}
      page={page ?? null}
      slug={org?.slug ?? ""}
      orgName={org?.name ?? ""}
      orgLogoUrl={org?.logo_url ?? null}
    />
  );
}
