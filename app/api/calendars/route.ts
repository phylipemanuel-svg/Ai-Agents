import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { newId, newApiKey } from "@/lib/id";
import { TYPE_DEFAULTS } from "@/lib/defaults";
import { Calendar, CalendarType } from "@/lib/types";

export async function GET() {
  const calendars = await store.listCalendars();
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "`name` is required" }, { status: 400 });
  }

  const type: CalendarType = TYPE_DEFAULTS[body.type as CalendarType] ? body.type : "custom";
  const defaults = TYPE_DEFAULTS[type];

  const calendar: Calendar = {
    id: newId("cal"),
    name: body.name.trim(),
    type,
    apiKey: newApiKey(),
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : defaults.timezone,
    slotMinutes: Number.isFinite(body.slotMinutes) ? body.slotMinutes : defaults.slotMinutes,
    openDays: Array.isArray(body.openDays) ? body.openDays : defaults.openDays,
    startMinute: Number.isFinite(body.startMinute) ? body.startMinute : defaults.startMinute,
    endMinute: Number.isFinite(body.endMinute) ? body.endMinute : defaults.endMinute,
    createdAt: new Date().toISOString(),
  };

  await store.createCalendar(calendar);
  return NextResponse.json({ calendar }, { status: 201 });
}
