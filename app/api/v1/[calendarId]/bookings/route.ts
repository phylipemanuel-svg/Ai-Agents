import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getApiKeyFromRequest } from "@/lib/auth";
import { newId } from "@/lib/id";
import { isWithinBusinessHours, hasOverlap } from "@/lib/slots";
import { Booking } from "@/lib/types";

type RouteParams = { params: Promise<{ calendarId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { calendarId } = await params;
  const calendar = await store.getCalendar(calendarId);
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey || apiKey !== calendar.apiKey) {
    return NextResponse.json({ error: "Unauthorized: missing or invalid API key" }, { status: 401 });
  }

  const bookings = await store.listBookings(calendar.id);
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { calendarId } = await params;
  const calendar = await store.getCalendar(calendarId);
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey || apiKey !== calendar.apiKey) {
    return NextResponse.json({ error: "Unauthorized: missing or invalid API key" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.start !== "string" || typeof body.customerName !== "string" || !body.customerName.trim()) {
    return NextResponse.json(
      { error: "`start` (ISO datetime) and `customerName` are required" },
      { status: 400 }
    );
  }

  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "`start` is not a valid ISO datetime" }, { status: 400 });
  }

  const end = body.end
    ? new Date(body.end)
    : new Date(start.getTime() + calendar.slotMinutes * 60_000);
  if (Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "`end` must be a valid ISO datetime after `start`" }, { status: 400 });
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  if (!isWithinBusinessHours(calendar, startIso, endIso)) {
    return NextResponse.json(
      { error: "Requested time falls outside this calendar's bookable slots" },
      { status: 409 }
    );
  }

  const existingBookings = await store.listBookings(calendar.id);
  if (hasOverlap(existingBookings, startIso, endIso)) {
    return NextResponse.json({ error: "That slot is already booked" }, { status: 409 });
  }

  const booking: Booking = {
    id: newId("bkg"),
    calendarId: calendar.id,
    start: startIso,
    end: endIso,
    customerName: body.customerName.trim(),
    customerContact: typeof body.customerContact === "string" ? body.customerContact : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  await store.createBooking(booking);
  return NextResponse.json({ booking }, { status: 201 });
}
