"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminSignupForm({ allowedEmails }: { allowedEmails: string[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const inviteOnly = allowedEmails.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setStatus("");

    if (!inviteOnly) {
      setStatus("Admin signup is not configured yet.");
      return;
    }
    if (!allowedEmails.includes(normalized)) {
      setStatus("This email is not on the super admin allowlist.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/admin`,
        data: { requested_platform_role: "super_admin" },
      },
    });
    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Check your email to verify admin access.");
    router.refresh();
  }

  return (
    <form className="admin-auth-form" onSubmit={submit}>
      <label>
        <span>Owner email</span>
        <div><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@company.com" required /></div>
      </label>
      <label>
        <span>Password</span>
        <div><ShieldAlert /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Minimum 8 characters" required /></div>
      </label>
      {status && <p>{status}</p>}
      <button type="submit" disabled={loading || !inviteOnly}>
        {loading ? "Checking..." : "Request Admin Access"} <ArrowRight />
      </button>
    </form>
  );
}
