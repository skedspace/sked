import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { isDevAuthEnabled } from "@/lib/dev-auth";

const DEV_AUTH_ENABLED = isDevAuthEnabled();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev mode: allow all paths without auth
  if (DEV_AUTH_ENABLED) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const { supabase, getResponse } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    getResponse().cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
