import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Optimistic gate only: it checks that a session cookie exists. Every page, server action and
 * route handler still validates the session against the database before touching data.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (token && request.method === "GET") {
    // Keep the browser cookie in step with the sliding server-side expiry.
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_DAYS * 86_400,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
