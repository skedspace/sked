import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getSession, getMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const isOwner = membership.role === "owner";
  const orgId = membership.org_id;
  const supabase = createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", orgId)
    .single();

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <DashboardSidebar
        isOwner={isOwner}
        orgId={orgId}
        orgSlug={organization?.slug ?? orgId}
        orgName={organization?.name ?? ""}
      />
      <main className="min-w-0 flex-1 bg-[#fbfaf7]">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
