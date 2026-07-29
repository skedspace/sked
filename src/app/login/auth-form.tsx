"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalytics } from "@/lib/analytics";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.61Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.82 1.49l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.61C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  redirectTo,
  initialError = null,
}: {
  mode: "login" | "signup";
  redirectTo?: string | null;
  initialError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const analytics = useAnalytics();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo ?? "/dashboard");
        router.refresh();
      } else {
        const next = redirectTo ?? "/onboarding";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;

        if (data.user?.id) {
          analytics.trackSignUp(data.user.id);
        }

        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setError("Check your email for the confirmation link.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    try {
      const next =
        redirectTo ?? (mode === "signup" ? "/onboarding" : "/dashboard");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Could not start Google sign-in",
      );
    }
  }

  const googleButton = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full bg-white"
      disabled={loading}
      onClick={handleGoogleSignIn}
    >
      <GoogleIcon />
      {loading ? "Redirecting..." : "Continue with Google"}
    </Button>
  );

  const divider = (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-black/10" />
      </div>
      <div className="relative flex justify-center text-[11px] tracking-[0.14em] uppercase">
        <span
          className={`text-muted-foreground px-3 ${
            mode === "signup" ? "bg-[#f7f6f0]" : "bg-background"
          }`}
        >
          or continue with email
        </span>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {mode === "signup" && googleButton}
      {mode === "signup" && divider}

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@yourbusiness.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 6 characters"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {mode === "signup" && (
          <p className="text-muted-foreground text-xs">
            Use 6 or more characters.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl border px-3.5 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </Button>

      {mode === "login" && divider}
      {mode === "login" && googleButton}
    </form>
  );
}
