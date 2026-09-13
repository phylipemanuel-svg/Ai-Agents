import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthConfigured, SESSION_COOKIE_NAME, verifySessionToken } from "./session";

// Node-runtime auth checks. Kept separate from lib/session.ts because the Edge
// middleware imports that file and cannot use next/headers. These are the
// authoritative gate: Vercel's "sensitive" env vars are not readable from the
// Edge middleware bundle, so middleware alone can silently fail to protect
// anything.

export async function isSignedIn(): Promise<boolean> {
  if (!isAuthConfigured()) return true;
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE_NAME)?.value);
}

/** Returns a 401 response for API routes when not signed in, otherwise null. */
export async function requireApiAuth(): Promise<NextResponse | null> {
  if (await isSignedIn()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
