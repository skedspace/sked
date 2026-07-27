import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HoursEditor } from "./hours-editor";

export default async function HoursPage() {
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
    .select("id, name")
    .eq("org_id", membership.org_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operating Hours</h1>
        <p className="text-muted-foreground">
          Set your weekly schedule for each location.
        </p>
      </div>
      {locations && locations.length > 0 ? (
        <HoursEditor locations={locations} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          Add a location first to set operating hours.
        </p>
      )}
    </div>
  );
}
