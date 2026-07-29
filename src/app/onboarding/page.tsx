import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrgSetupForm } from "./org-setup-form";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; term?: string }>;
}) {
  const selection = await searchParams;
  const termMonths = selection.plan === "premium" ? Number(selection.term ?? 1) : null;
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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-2xl font-bold">Set up your business</h1>
        <p className="mb-8 text-muted-foreground">
          Create your public page in under 10 minutes.
        </p>
        <OrgSetupForm userId={session.user.id} termMonths={termMonths} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-primary hover:underline">
            I&apos;ll do this later
          </Link>
        </p>
      </div>
    </main>
  );
}
