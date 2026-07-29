import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrgSetupForm } from "./org-setup-form";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { OnboardingShell } from "@/components/shared/onboarding-shell";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; term?: string }>;
}) {
  const selection = await searchParams;
  const termMonths =
    selection.plan === "premium" ? Number(selection.term ?? 1) : null;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user already has an org
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", session.user.id)
    .limit(1);

  // Dev mode: skip membership check — show onboarding form for testing
  const isDev = isDevAuthEnabled();

  if (!isDev && memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="Set up your business"
      description="Choose your name and booking page."
    >
      <OrgSetupForm termMonths={termMonths} />
    </OnboardingShell>
  );
}
