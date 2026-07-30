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
  const securityHeaders = {
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://randomuser.me https://avatars.githubusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://app.posthog.com https://*.posthog.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://cloudflareinsights.com https://*.cloudflareinsights.com",
      "frame-src 'self' https://*.supabase.co",
      "child-src 'self'",
      "media-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
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
