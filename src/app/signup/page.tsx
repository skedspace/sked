import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "../login/auth-form";
import { isDevAuthEnabled } from "@/lib/dev-auth";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
        <AuthForm mode="signup" redirectTo={onboardingPath} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span className="mx-2">&middot;</span>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </div>
      </div>
    </main>
  );
}
