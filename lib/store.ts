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

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function restCredentials() {
  const url = envValue("KV_REST_API_URL") ?? envValue("UPSTASH_REDIS_REST_URL");
  const token = envValue("KV_REST_API_TOKEN") ?? envValue("UPSTASH_REDIS_REST_TOKEN");
  return url && token ? { url, token } : null;
}

function connectionUrl(): string | undefined {
  return envValue("REDIS_URL") ?? envValue("KV_URL");
}

export type StoreBackend = "upstash-rest" | "redis-url" | "memory";

export function detectBackend(): StoreBackend {
  if (restCredentials()) return "upstash-rest";
  if (connectionUrl()) return "redis-url";
  return "memory";
}

/** Minimal key/value surface the Redis store needs, so either client can back it. */
interface KvClient {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
}

async function createRestClient(): Promise<KvClient> {
  const credentials = restCredentials()!;
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis(credentials);
  return {
    // The REST client deserializes stored JSON for us.
    getJson: async <T,>(key: string) => (await redis.get<T>(key)) ?? null,
    setJson: async (key, value) => {
      await redis.set(key, value);
    },
    del: async (key) => {
      await redis.del(key);
    },
    smembers: async (key) => (await redis.smembers(key)) as string[],
    sadd: async (key, member) => {
      await redis.sadd(key, member);
    },
    srem: async (key, member) => {
      await redis.srem(key, member);
    },
  };
}

async function createConnectionClient(): Promise<KvClient> {
  const { default: Redis } = await import("ioredis");
  const redis = new Redis(connectionUrl()!, { maxRetriesPerRequest: 3 });
  return {
    getJson: async <T,>(key: string) => {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    setJson: async (key, value) => {
      await redis.set(key, JSON.stringify(value));
    },
    del: async (key) => {
      await redis.del(key);
    },
    smembers: (key) => redis.smembers(key),
    sadd: async (key, member) => {
      await redis.sadd(key, member);
    },
    srem: async (key, member) => {
      await redis.srem(key, member);
    },
  };
}

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

class RedisStore implements Store {
  private clientPromise: Promise<KvClient> | null = null;

  constructor(private readonly connect: () => Promise<KvClient>) {}

  private client() {
    if (!this.clientPromise) this.clientPromise = this.connect();
    return this.clientPromise;
  }

  async listCalendars() {
    const kv = await this.client();
    const ids = await kv.smembers(CALENDAR_IDS_KEY);
    if (!ids.length) return [];
    const calendars = await Promise.all(ids.map((id) => kv.getJson<Calendar>(calendarKey(id))));
    return calendars
      .filter((c): c is Calendar => Boolean(c))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getCalendar(id: string) {
    const kv = await this.client();
    return kv.getJson<Calendar>(calendarKey(id));
  }

  async createCalendar(calendar: Calendar) {
    const kv = await this.client();
    await kv.setJson(calendarKey(calendar.id), calendar);
    await kv.sadd(CALENDAR_IDS_KEY, calendar.id);
  }

  async updateCalendar(id: string, patch: Partial<Calendar>) {
    const kv = await this.client();
    const existing = await this.getCalendar(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    await kv.setJson(calendarKey(id), updated);
    return updated;
  }

  async deleteCalendar(id: string) {
    const kv = await this.client();
    const bookingIds = await kv.smembers(bookingIdsKey(id));
    if (bookingIds.length) {
      await Promise.all(bookingIds.map((bid) => kv.del(bookingKey(bid))));
      await kv.del(bookingIdsKey(id));
    }
    await kv.del(calendarKey(id));
    await kv.srem(CALENDAR_IDS_KEY, id);
  }

  async listBookings(calendarId: string) {
    const kv = await this.client();
    const ids = await kv.smembers(bookingIdsKey(calendarId));
    if (!ids.length) return [];
    const bookings = await Promise.all(ids.map((id) => kv.getJson<Booking>(bookingKey(id))));
    return bookings
      .filter((b): b is Booking => Boolean(b))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async getBooking(calendarId: string, bookingId: string) {
    const kv = await this.client();
    const booking = await kv.getJson<Booking>(bookingKey(bookingId));
    if (!booking || booking.calendarId !== calendarId) return null;
    return booking;
  }

  async createBooking(booking: Booking) {
    const kv = await this.client();
    await kv.setJson(bookingKey(booking.id), booking);
    await kv.sadd(bookingIdsKey(booking.calendarId), booking.id);
  }

  async cancelBooking(calendarId: string, bookingId: string) {
    const kv = await this.client();
    const booking = await this.getBooking(calendarId, bookingId);
    if (!booking) return false;
    booking.status = "cancelled";
    await kv.setJson(bookingKey(bookingId), booking);
    return true;
  }
}

function createStore(): Store {
  switch (detectBackend()) {
    case "upstash-rest":
      return new RedisStore(createRestClient);
    case "redis-url":
      return new RedisStore(createConnectionClient);
    default:
      return new MemoryStore();
  }
}

// Survive Next.js dev-server hot reloads by stashing the singleton on globalThis.
const globalForStore = globalThis as unknown as { __bookingStore?: Store };

export const store: Store = globalForStore.__bookingStore ?? createStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__bookingStore = store;
}

export const usingPersistentStore = detectBackend() !== "memory";
