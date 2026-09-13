import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getApiKeyFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ calendarId: string; bookingId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { calendarId, bookingId } = await params;
  const calendar = await store.getCalendar(calendarId);
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey || apiKey !== calendar.apiKey) {
    return NextResponse.json({ error: "Unauthorized: missing or invalid API key" }, { status: 401 });
  }

  const booking = await store.getBooking(calendarId, bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { calendarId, bookingId } = await params;
  const calendar = await store.getCalendar(calendarId);
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey || apiKey !== calendar.apiKey) {
    return NextResponse.json({ error: "Unauthorized: missing or invalid API key" }, { status: 401 });
  }

  const ok = await store.cancelBooking(calendarId, bookingId);
  if (!ok) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
