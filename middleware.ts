import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const ANONYMOUS_COOKIE_NAME = "anonymousId";

export function middleware(request: NextRequest) {
  const existingId = request.cookies.get(ANONYMOUS_COOKIE_NAME)?.value;
  const anonymousId = existingId || crypto.randomUUID();

  // Clone request headers to inject x-anonymous-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-anonymous-id", anonymousId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!existingId) {
    response.cookies.set({
      name: ANONYMOUS_COOKIE_NAME,
      value: anonymousId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 yıl
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
