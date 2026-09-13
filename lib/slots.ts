import { zonedTimeToUtc } from "date-fns-tz";
import { Booking, Calendar, DayAvailability, Slot } from "./types";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function minutesToHHMM(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Weekday (0=Sun..6=Sat) of a YYYY-MM-DD date string, independent of local timezone. */
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function nextNDates(n: number, startOffsetDays = 0): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = startOffsetDays; i < startOffsetDays + n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function generateDaySlots(
  calendar: Calendar,
  dateStr: string,
  bookings: Booking[]
): DayAvailability {
  const slots: Slot[] = [];
  if (calendar.openDays.includes(weekdayOf(dateStr))) {
    const now = Date.now();
    const active = bookings.filter((b) => b.status === "confirmed");

    for (
      let minute = calendar.startMinute;
      minute + calendar.slotMinutes <= calendar.endMinute;
      minute += calendar.slotMinutes
    ) {
      const localStart = `${dateStr} ${minutesToHHMM(minute)}:00`;
      const localEnd = `${dateStr} ${minutesToHHMM(minute + calendar.slotMinutes)}:00`;
      const startUtc = zonedTimeToUtc(localStart, calendar.timezone);
      const endUtc = zonedTimeToUtc(localEnd, calendar.timezone);

      if (startUtc.getTime() < now) continue;

      const overlapping = active.find(
        (b) => startUtc < new Date(b.end) && endUtc > new Date(b.start)
      );

      slots.push({
        start: startUtc.toISOString(),
        end: endUtc.toISOString(),
        available: !overlapping,
        bookingId: overlapping?.id,
      });
    }
  }

  return { date: dateStr, slots };
}

export function isWithinBusinessHours(calendar: Calendar, startIso: string, endIso: string): boolean {
  const day = generateDaySlots(calendar, startIso.slice(0, 10), []);
  return day.slots.some((s) => s.start === startIso && s.end === endIso);
}

export function hasOverlap(bookings: Booking[], startIso: string, endIso: string, ignoreId?: string): boolean {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return bookings.some(
    (b) =>
      b.status === "confirmed" &&
      b.id !== ignoreId &&
      start < new Date(b.end) &&
      end > new Date(b.start)
  );
}
