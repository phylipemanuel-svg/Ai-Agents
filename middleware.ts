import { NextRequest, NextResponse } from "next/server";
import { isAuthConfigured, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Agent-facing API authenticates per-calendar via API key, not the admin login.
  if (pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  if (!isAuthConfigured() || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.png|brand/).*)"],
};
