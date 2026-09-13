import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { newId, newApiKey } from "@/lib/id";
import { CALENDAR_TYPE_LABELS, TYPE_DEFAULTS } from "@/lib/defaults";
import { Calendar, CalendarType } from "@/lib/types";

const SEED_TYPES: CalendarType[] = ["dentist", "lawyer", "golf", "estate-agent"];

export async function POST() {
  const existing = await store.listCalendars();
  const existingTypes = new Set(existing.map((c) => c.type));

  const created: Calendar[] = [];
  for (const type of SEED_TYPES) {
    if (existingTypes.has(type)) continue;
    const defaults = TYPE_DEFAULTS[type];
    const calendar: Calendar = {
      id: newId("cal"),
      name: defaults.exampleName,
      type,
      apiKey: newApiKey(),
      timezone: defaults.timezone,
      slotMinutes: defaults.slotMinutes,
      openDays: defaults.openDays,
      startMinute: defaults.startMinute,
      endMinute: defaults.endMinute,
      createdAt: new Date().toISOString(),
    };
    await store.createCalendar(calendar);
    created.push(calendar);
  }

  return NextResponse.json({
    created,
    message: created.length
      ? `Created ${created.length} demo calendar(s): ${created
          .map((c) => CALENDAR_TYPE_LABELS[c.type])
          .join(", ")}`
      : "All demo calendar types already exist.",
  });
}
