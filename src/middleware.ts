import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { isDevAuthEnabled } from "@/lib/dev-auth";

const DEV_AUTH_ENABLED = isDevAuthEnabled();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const middlewareRequest = new NextRequest(request, {
    headers: requestHeaders,
  });
  // In dev, React Refresh injects inline scripts without our nonce and connects
  // to an HMR websocket. A nonce-only script-src blocks those, so the app never
  // hydrates locally. Relax script-src and connect-src for dev only — production
  // keeps the strict nonce-based policy. (A nonce present alongside
  // 'unsafe-inline' makes browsers ignore 'unsafe-inline', so dev drops the
  // nonce entirely.)
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com"
    : `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`;
  const connectSrc =
    "connect-src 'self' https://*.supabase.co https://app.posthog.com https://*.posthog.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://cloudflareinsights.com https://*.cloudflareinsights.com" +
    (isDev ? " ws: http://localhost:* http://127.0.0.1:*" : "");

  const securityHeaders = {
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://randomuser.me https://avatars.githubusercontent.com",
      "font-src 'self' data:",
      connectSrc,
      "frame-src 'self' https://*.supabase.co",
      "child-src 'self'",
      "media-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      // Forces http→https upgrades; on localhost that breaks HMR assets.
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; "),
    "Permissions-Policy":
      "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(self), usb=()",
  };
  const next = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  const applySecurityHeaders = (response: NextResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  };

  // Supabase falls back to the project's Site URL when a link's redirect target
  // is missing from the Redirect URLs allowlist, so confirmation and OAuth
  // codes can land on the landing page instead of /auth/callback — the user
  // sees the marketing page with `?code=…` stuck on the end and stays signed
  // out. Forward anything that is plainly an auth landing to the callback.
  if (pathname === "/") {
    const params = request.nextUrl.searchParams;
    const isAuthLanding =
      params.has("code") ||
      params.has("token_hash") ||
      params.has("error_description");

    if (isAuthLanding) {
      const callbackUrl = new URL("/auth/callback", request.url);
      params.forEach((value, key) => callbackUrl.searchParams.set(key, value));
      if (!callbackUrl.searchParams.has("next")) {
        // /dashboard sends users without an organization on to /onboarding, so
        // this is the right target for both confirmation and sign-in links.
        callbackUrl.searchParams.set("next", "/dashboard");
      }
      return applySecurityHeaders(NextResponse.redirect(callbackUrl));
    }
  }

  // Dev mode: allow all paths without auth
  if (DEV_AUTH_ENABLED) {
    return applySecurityHeaders(next());
  }

  // Check session for protected routes
  const { supabase, getResponse } = createMiddlewareClient(middlewareRequest);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    getResponse()
      .cookies.getAll()
      .forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
    return applySecurityHeaders(redirectResponse);
  }

  return applySecurityHeaders(getResponse());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
