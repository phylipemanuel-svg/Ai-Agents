import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const calendar = await store.getCalendar(id);
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ calendar });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const key of ["name", "timezone", "slotMinutes", "openDays", "startMinute", "endMinute"]) {
    if (key in body) patch[key] = body[key];
  }

  const calendar = await store.updateCalendar(id, patch);
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ calendar });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const existing = await store.getCalendar(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await store.deleteCalendar(id);
  return NextResponse.json({ ok: true });
}
