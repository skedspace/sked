import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "../login/auth-form";

export default async function SignupPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/onboarding");
  }

  // Dev mode: skip signup entirely
  if (process.env.NODE_ENV !== "production") {
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
        <AuthForm mode="signup" />
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
