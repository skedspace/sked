import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const DEV_AUTH_ENABLED = process.env.NODE_ENV !== "production";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev mode: allow all paths without auth
  if (DEV_AUTH_ENABLED) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const supabase = createMiddlewareClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to login if not authenticated
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
