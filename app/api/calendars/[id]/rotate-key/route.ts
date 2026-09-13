import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { newApiKey } from "@/lib/id";
import { requireApiAuth } from "@/lib/require-auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth();
  if (denied) return denied;

  const { id } = await params;
  const calendar = await store.updateCalendar(id, { apiKey: newApiKey() });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ calendar });
}
