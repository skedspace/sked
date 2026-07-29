import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "./auth-form";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { redirect: redirectTo } = await searchParams;

  if (session) {
    redirect(redirectTo ?? "/dashboard");
  }

  // Dev mode: skip login entirely
  if (isDevAuthEnabled()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
        <AuthForm mode="login" redirectTo={redirectTo} />
        <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          <Link href="/signup" className="hover:underline">Create account</Link>
          <span className="mx-2">&middot;</span>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span className="mx-2">&middot;</span>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </div>
      </div>
    </main>
  );
}
