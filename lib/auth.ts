import { NextRequest } from "next/server";

export function getApiKeyFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
  return req.headers.get("x-api-key");
}
