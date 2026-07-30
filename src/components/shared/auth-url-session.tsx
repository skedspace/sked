"use client";

import { useEffect } from "react";

/**
 * Rescues sessions that arrive in the URL fragment.
 *
 * Supabase projects that are not on the PKCE flow — or whose email templates
 * use `{{ .ConfirmationURL }}` — send users back with the tokens in the hash:
 *
 *     https://sked.space/#access_token=…&refresh_token=…&type=signup
 *
 * The fragment never reaches the server, so middleware cannot help here. Left
 * alone the visitor sits on the landing page, still signed out, looking at a
 * URL full of tokens. This picks the tokens up, writes the session to cookies
 * through the browser client, scrubs the fragment, and then hard-navigates so
 * the server renders with the new session.
 */
export function AuthUrlSession() {
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;

    const params = new URLSearchParams(raw);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // A rejected link (expired, already used) comes back the same way.
      if (params.has("error_description") || params.has("error_code")) {
        window.history.replaceState(null, "", stripHash());
        window.location.assign("/login?error=auth_failed");
      }
      return;
    }

    let cancelled = false;

    (async () => {
      let failure: string | null = null;

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { error } = await createClient().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        failure = error?.message ?? null;
      } catch (err) {
        // A malformed or truncated token makes setSession throw rather than
        // return an error, and an unhandled rejection here would leave the user
        // parked on the landing page with the tokens still in the URL.
        failure = err instanceof Error ? err.message : "invalid session tokens";
      }

      if (cancelled) return;

      // Drop the tokens from the address bar either way — they should not stay
      // in history or get copy-pasted around.
      window.history.replaceState(null, "", stripHash());

      if (failure) {
        console.error("[auth] could not restore session from URL", failure);
        window.location.assign("/login?error=auth_failed");
        return;
      }

      // /dashboard forwards to /onboarding when the user has no organization,
      // which covers the just-confirmed-my-signup case.
      window.location.assign("/dashboard");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

function stripHash() {
  return window.location.pathname + window.location.search;
}
