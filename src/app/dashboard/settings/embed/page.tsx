import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmbedSnippet } from "./embed-snippet";

export default async function EmbedSettingsPage() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Embed Widget</h1>
        <p className="text-muted-foreground">
          Add a booking widget to your own website.
        </p>
      </div>
      <EmbedSnippet slug={org?.slug ?? ""} />
    </div>
  );
}
