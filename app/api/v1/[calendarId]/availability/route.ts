import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getApiKeyFromRequest } from "@/lib/auth";
import { generateDaySlots, nextNDates } from "@/lib/slots";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  const { calendarId } = await params;
  const calendar = await store.getCalendar(calendarId);
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey || apiKey !== calendar.apiKey) {
    return NextResponse.json({ error: "Unauthorized: missing or invalid API key" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const daysParam = Number(searchParams.get("days"));
  const days = date ? [date] : nextNDates(Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7);

  const bookings = await store.listBookings(calendar.id);
  const availability = days.map((d) => generateDaySlots(calendar, d, bookings));

  return NextResponse.json({
    calendar: { id: calendar.id, name: calendar.name, type: calendar.type, timezone: calendar.timezone, slotMinutes: calendar.slotMinutes },
    availability,
  });
}
