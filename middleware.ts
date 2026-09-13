import { NextRequest, NextResponse } from "next/server";

// Agent-facing API (/api/v1/*) authenticates per-calendar via API key instead
// of admin credentials, so it's left alone here.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();
  const user = process.env.ADMIN_USER || "admin";

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPass = decoded.slice(separatorIndex + 1);
    if (suppliedUser === user && suppliedPass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Booking Sandbox Admin"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
