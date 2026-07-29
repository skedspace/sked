import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BoardSettings } from "@/components/board/board-settings";
import type { SponsorItem } from "@/components/board/sponsor-marquee";

export const dynamic = "force-dynamic";

function safeSponsors(value: unknown): SponsorItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SponsorItem => {
    if (!item || typeof item !== "object") return false;
    const sponsor = item as Partial<SponsorItem>;
    return (
      typeof sponsor.id === "string" &&
      (sponsor.type === "text" || sponsor.type === "logo") &&
      typeof sponsor.content === "string" &&
      sponsor.content.trim().length > 0
    );
  });
}

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

  const { data: settings } = await supabase
    .from("org_settings")
    .select("board_sponsors")
    .eq("org_id", membership.org_id)
    .maybeSingle();

  return (
    <BoardSettings
      orgId={membership.org_id}
      orgSlug={organization?.slug ?? membership.org_id}
      initialSponsors={safeSponsors(settings?.board_sponsors)}
    />
  );
}
