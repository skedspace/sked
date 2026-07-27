import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarSettings } from "./calendar-settings";

export default async function CalendarSyncPage() {
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

  const { data: sync } = await supabase
    .from("google_calendar_syncs")
    .select("*")
    .eq("org_id", membership.org_id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Calendar</h1>
        <p className="text-muted-foreground">
          Sync your bookings with Google Calendar.
        </p>
      </div>
      <CalendarSettings
        orgId={membership.org_id}
        isOwner={membership.role === "owner"}
        sync={sync ?? null}
      />
    </div>
  );
}
