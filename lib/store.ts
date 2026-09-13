import { Booking, Calendar } from "./types";

export interface Store {
  listCalendars(): Promise<Calendar[]>;
  getCalendar(id: string): Promise<Calendar | null>;
  createCalendar(calendar: Calendar): Promise<void>;
  updateCalendar(id: string, patch: Partial<Calendar>): Promise<Calendar | null>;
  deleteCalendar(id: string): Promise<void>;

  listBookings(calendarId: string): Promise<Booking[]>;
  getBooking(calendarId: string, bookingId: string): Promise<Booking | null>;
  createBooking(booking: Booking): Promise<void>;
  cancelBooking(calendarId: string, bookingId: string): Promise<boolean>;
}

const CALENDAR_IDS_KEY = "calendars:index";
const calendarKey = (id: string) => `calendar:${id}`;
const bookingIdsKey = (calendarId: string) => `calendar:${calendarId}:bookings`;
const bookingKey = (id: string) => `booking:${id}`;

class MemoryStore implements Store {
  private calendars = new Map<string, Calendar>();
  private bookings = new Map<string, Booking>();
  private bookingsByCalendar = new Map<string, Set<string>>();

  async listCalendars() {
    return Array.from(this.calendars.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  async getCalendar(id: string) {
    return this.calendars.get(id) ?? null;
  }

  async createCalendar(calendar: Calendar) {
    this.calendars.set(calendar.id, calendar);
    this.bookingsByCalendar.set(calendar.id, new Set());
  }

  async updateCalendar(id: string, patch: Partial<Calendar>) {
    const existing = this.calendars.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    this.calendars.set(id, updated);
    return updated;
  }

  async deleteCalendar(id: string) {
    const ids = this.bookingsByCalendar.get(id);
    if (ids) {
      for (const bookingId of ids) this.bookings.delete(bookingId);
    }
    this.bookingsByCalendar.delete(id);
    this.calendars.delete(id);
  }

  async listBookings(calendarId: string) {
    const ids = this.bookingsByCalendar.get(calendarId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.bookings.get(id))
      .filter((b): b is Booking => Boolean(b))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async getBooking(calendarId: string, bookingId: string) {
    const booking = this.bookings.get(bookingId);
    if (!booking || booking.calendarId !== calendarId) return null;
    return booking;
  }

  async createBooking(booking: Booking) {
    this.bookings.set(booking.id, booking);
    if (!this.bookingsByCalendar.has(booking.calendarId)) {
      this.bookingsByCalendar.set(booking.calendarId, new Set());
    }
    this.bookingsByCalendar.get(booking.calendarId)!.add(booking.id);
  }

  async cancelBooking(calendarId: string, bookingId: string) {
    const booking = this.bookings.get(bookingId);
    if (!booking || booking.calendarId !== calendarId) return false;
    booking.status = "cancelled";
    return true;
  }
}

function kvEnv() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

class KvStore implements Store {
  private async kv() {
    const { Redis } = await import("@upstash/redis");
    const { url, token } = kvEnv();
    return new Redis({ url: url!, token: token! });
  }

  async listCalendars() {
    const kv = await this.kv();
    const ids = (await kv.smembers(CALENDAR_IDS_KEY)) as string[];
    if (!ids.length) return [];
    const calendars = await Promise.all(
      ids.map((id) => kv.get<Calendar>(calendarKey(id)))
    );
    return calendars
      .filter((c): c is Calendar => Boolean(c))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getCalendar(id: string) {
    const kv = await this.kv();
    return (await kv.get<Calendar>(calendarKey(id))) ?? null;
  }

  async createCalendar(calendar: Calendar) {
    const kv = await this.kv();
    await kv.set(calendarKey(calendar.id), calendar);
    await kv.sadd(CALENDAR_IDS_KEY, calendar.id);
  }

  async updateCalendar(id: string, patch: Partial<Calendar>) {
    const kv = await this.kv();
    const existing = await this.getCalendar(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    await kv.set(calendarKey(id), updated);
    return updated;
  }

  async deleteCalendar(id: string) {
    const kv = await this.kv();
    const bookingIds = (await kv.smembers(bookingIdsKey(id))) as string[];
    if (bookingIds.length) {
      await Promise.all(bookingIds.map((bid) => kv.del(bookingKey(bid))));
      await kv.del(bookingIdsKey(id));
    }
    await kv.del(calendarKey(id));
    await kv.srem(CALENDAR_IDS_KEY, id);
  }

  async listBookings(calendarId: string) {
    const kv = await this.kv();
    const ids = (await kv.smembers(bookingIdsKey(calendarId))) as string[];
    if (!ids.length) return [];
    const bookings = await Promise.all(
      ids.map((id) => kv.get<Booking>(bookingKey(id)))
    );
    return bookings
      .filter((b): b is Booking => Boolean(b))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async getBooking(calendarId: string, bookingId: string) {
    const kv = await this.kv();
    const booking = await kv.get<Booking>(bookingKey(bookingId));
    if (!booking || booking.calendarId !== calendarId) return null;
    return booking;
  }

  async createBooking(booking: Booking) {
    const kv = await this.kv();
    await kv.set(bookingKey(booking.id), booking);
    await kv.sadd(bookingIdsKey(booking.calendarId), booking.id);
  }

  async cancelBooking(calendarId: string, bookingId: string) {
    const kv = await this.kv();
    const booking = await this.getBooking(calendarId, bookingId);
    if (!booking) return false;
    booking.status = "cancelled";
    await kv.set(bookingKey(bookingId), booking);
    return true;
  }
}

function hasKvEnv() {
  const { url, token } = kvEnv();
  return Boolean(url && token);
}

function createStore(): Store {
  return hasKvEnv() ? new KvStore() : new MemoryStore();
}

// Survive Next.js dev-server hot reloads by stashing the singleton on globalThis.
const globalForStore = globalThis as unknown as { __bookingStore?: Store };

export const store: Store = globalForStore.__bookingStore ?? createStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__bookingStore = store;
}

export const usingPersistentStore = hasKvEnv();
