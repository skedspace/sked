import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function safeNext(value: string | null) {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next =
    safeNext(searchParams.get("next")) ??
    safeNext(searchParams.get("redirect")) ??
    "/dashboard";

  const failure = (reason: string) => {
    console.error("[auth/callback]", reason);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  };

  // Supabase reports rejected links (expired, already used, wrong project)
  // in the query string rather than as a failed exchange.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return failure(providerError);
  }

  const supabase = createClient();

  // PKCE / OAuth links arrive as ?code=…
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure(error.message) : NextResponse.redirect(`${origin}${next}`);
  }

  // Email templates built on {{ .TokenHash }} arrive as ?token_hash=…&type=…
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = OTP_TYPES.find((candidate) => candidate === rawType);
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    return error ? failure(error.message) : NextResponse.redirect(`${origin}${next}`);
  }

  return failure("callback reached with no code or token_hash");
}
