import { NextResponse } from "next/server";
import { detectBackend, store } from "@/lib/store";
import { isAuthConfigured } from "@/lib/session";

export const dynamic = "force-dynamic";

// Deliberately reports only booleans and non-secret metadata — safe to leave
// reachable without logging in, which is what makes it useful for debugging a
// deployment where the login gate itself looks misconfigured.
export async function GET() {
  const backend = detectBackend();

  let storeReadable: boolean;
  let storeError: string | null = null;
  let calendarCount: number | null = null;
  try {
    calendarCount = (await store.listCalendars()).length;
    storeReadable = true;
  } catch (err) {
    storeReadable = false;
    storeError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    deployment: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      environment: process.env.VERCEL_ENV ?? "local",
    },
    storage: { backend, storeReadable, calendarCount, storeError },
    auth: { loginRequired: isAuthConfigured() },
    envVarsVisible: {
      ADMIN_USER: Boolean(process.env.ADMIN_USER),
      ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      REDIS_URL: Boolean(process.env.REDIS_URL),
    },
  });
}
