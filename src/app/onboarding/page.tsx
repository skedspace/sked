import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrgSetupForm } from "./org-setup-form";

export default async function OnboardingPage() {
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
  const isDev =
    process.env.NODE_ENV !== "production" ||
    process.env.DEV_AUTH === "true" ||
    process.env.NEXT_PUBLIC_DEV_AUTH === "true";

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
        <OrgSetupForm userId={session.user.id} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-primary hover:underline">
            I&apos;ll do this later
          </Link>
        </p>
      </div>
    </main>
  );
}
