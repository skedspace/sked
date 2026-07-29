import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "../login/auth-form";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { OnboardingShell } from "@/components/shared/onboarding-shell";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; term?: string }>;
}) {
  const selection = await searchParams;
  const params = new URLSearchParams();
  if (selection.plan) params.set("plan", selection.plan);
  if (selection.billing) params.set("billing", selection.billing);
  if (selection.term) params.set("term", selection.term);
  const onboardingPath = `/onboarding${params.size ? `?${params}` : ""}`;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect(onboardingPath);
  }

  // Dev mode: skip signup entirely
  if (isDevAuthEnabled()) {
    redirect(onboardingPath);
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="Create your account"
      description="Continue with Google or use your email."
    >
      <AuthForm mode="signup" redirectTo={onboardingPath} />
      <p className="text-muted-foreground mt-6 text-center text-xs leading-5">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </OnboardingShell>
  );
}
