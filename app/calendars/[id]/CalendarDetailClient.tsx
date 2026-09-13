"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Booking, Calendar, DayAvailability } from "@/lib/types";
import { CALENDAR_TYPE_EMOJI, CALENDAR_TYPE_LABELS } from "@/lib/defaults";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarDetailClient({
  initialCalendar,
  initialBookings,
  baseUrl,
}: {
  initialCalendar: Calendar;
  initialBookings: Booking[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [calendar, setCalendar] = useState(initialCalendar);
  const [bookings, setBookings] = useState(initialBookings);
  const [showKey, setShowKey] = useState(false);
  const [editingHours, setEditingHours] = useState(false);

  async function refreshBookings() {
    const res = await fetch(`/api/v1/${calendar.id}/bookings`, {
      headers: { "x-api-key": calendar.apiKey },
      cache: "no-store",
    });
    if (res.ok) setBookings((await res.json()).bookings);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    await fetch(`/api/v1/${calendar.id}/bookings/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": calendar.apiKey },
    });
    await refreshBookings();
  }

  async function rotateKey() {
    if (!confirm("Rotate the API key? Anything using the old key will stop working.")) return;
    const res = await fetch(`/api/calendars/${calendar.id}/rotate-key`, { method: "POST" });
    const data = await res.json();
    setCalendar(data.calendar);
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.end) > new Date());
  const past = bookings.filter((b) => b.status !== "confirmed" || new Date(b.end) <= new Date());

  const curlAvailability = `curl "${baseUrl}/api/v1/${calendar.id}/availability?date=${todayStr()}" \\\n  -H "x-api-key: ${calendar.apiKey}"`;
  const curlBook = `curl -X POST "${baseUrl}/api/v1/${calendar.id}/bookings" \\\n  -H "x-api-key: ${calendar.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"start":"2026-09-15T10:00:00.000Z","customerName":"Jane Doe","customerContact":"jane@example.com"}'`;
  const curlCancel = `curl -X DELETE "${baseUrl}/api/v1/${calendar.id}/bookings/BOOKING_ID" \\\n  -H "x-api-key: ${calendar.apiKey}"`;

  return (
    <div>
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← All calendars
      </Link>

      <header className="mt-2 mb-6 flex items-center gap-3">
        <span className="text-3xl">{CALENDAR_TYPE_EMOJI[calendar.type]}</span>
        <div>
          <h1 className="text-2xl font-semibold">{calendar.name}</h1>
          <p className="text-sm text-slate-500">{CALENDAR_TYPE_LABELS[calendar.type]}</p>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-medium">API credentials</h2>
        <p className="mt-1 text-sm text-slate-500">
          Give these to the agent that should manage this calendar. Every request must include the
          API key — as an <code>x-api-key</code> header or <code>Authorization: Bearer</code>.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-600">Calendar ID</dt>
            <dd className="break-all font-mono text-xs">{calendar.id}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-600">Base URL</dt>
            <dd className="break-all font-mono text-xs">{baseUrl}/api/v1/{calendar.id}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-600">API key</dt>
            <dd className="break-all font-mono text-xs">
              {showKey ? calendar.apiKey : "•".repeat(20)}
            </dd>
            <button onClick={() => setShowKey((s) => !s)} className="text-xs text-slate-500 underline">
              {showKey ? "Hide" : "Show"}
            </button>
            <button onClick={rotateKey} className="text-xs text-red-500 underline">
              Rotate
            </button>
          </div>
        </dl>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Example requests
          </summary>
          <div className="mt-2 space-y-3">
            <CodeBlock label="Check availability" code={curlAvailability} />
            <CodeBlock label="Create a booking" code={curlBook} />
            <CodeBlock label="Cancel a booking" code={curlCancel} />
          </div>
        </details>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Business hours</h2>
          <button onClick={() => setEditingHours((v) => !v)} className="text-xs text-slate-500 underline">
            {editingHours ? "Cancel" : "Edit"}
          </button>
        </div>
        {editingHours ? (
          <BusinessHoursForm
            calendar={calendar}
            onSaved={(updated) => {
              setCalendar(updated);
              setEditingHours(false);
              router.refresh();
            }}
          />
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {calendar.openDays
              .slice()
              .sort()
              .map((d) => DAY_LABELS[d])
              .join(", ")}{" "}
            &middot; {minutesToHHMM(calendar.startMinute)}–{minutesToHHMM(calendar.endMinute)} &middot;{" "}
            {calendar.slotMinutes}-min slots &middot; {calendar.timezone}
          </p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Create a test booking</h2>
        <TestBookingForm calendarId={calendar.id} apiKey={calendar.apiKey} onBooked={refreshBookings} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Bookings ({upcoming.length} upcoming)</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...upcoming, ...past].map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className={b.status === "cancelled" ? "text-slate-400 line-through" : ""}>
                    {new Date(b.start).toLocaleString()} — {b.customerName}
                  </span>
                  {b.customerContact && (
                    <span className="ml-2 text-xs text-slate-400">{b.customerContact}</span>
                  )}
                </div>
                {b.status === "confirmed" && new Date(b.end) > new Date() && (
                  <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-500 underline">
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function BusinessHoursForm({
  calendar,
  onSaved,
}: {
  calendar: Calendar;
  onSaved: (c: Calendar) => void;
}) {
  const [openDays, setOpenDays] = useState<number[]>(calendar.openDays);
  const [start, setStart] = useState(minutesToHHMM(calendar.startMinute));
  const [end, setEnd] = useState(minutesToHHMM(calendar.endMinute));
  const [slotMinutes, setSlotMinutes] = useState(calendar.slotMinutes);
  const [timezone, setTimezone] = useState(calendar.timezone);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setOpenDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/calendars/${calendar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openDays,
        startMinute: hhmmToMinutes(start),
        endMinute: hhmmToMinutes(end),
        slotMinutes,
        timezone,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved((await res.json()).calendar);
  }

  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {DAY_LABELS.map((label, d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`rounded-md border px-2 py-1 text-xs ${
              openDays.includes(d)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1">
          Open
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Close
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Slot length (min)
          <input
            type="number"
            min={5}
            step={5}
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Timezone
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save business hours"}
      </button>
    </div>
  );
}

function TestBookingForm({
  calendarId,
  apiKey,
  onBooked,
}: {
  calendarId: string;
  apiKey: string;
  onBooked: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadAvailability(d: string) {
    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/v1/${calendarId}/availability?date=${d}`, {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      });
      const data = await res.json();
      setAvailability(data.availability?.[0] ?? { date: d, slots: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function book() {
    if (!selectedSlot || !customerName.trim()) {
      setError("Pick a slot and enter a customer name.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/${calendarId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ start: selectedSlot, customerName }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not book that slot");
      return;
    }
    setCustomerName("");
    setSelectedSlot(null);
    await loadAvailability(date);
    onBooked();
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadAvailability(e.target.value);
          }}
          className="rounded-md border border-slate-300 px-2 py-1"
        />
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
      </div>

      {availability && availability.slots.length === 0 && !loading && (
        <p className="text-xs text-slate-400">Closed, or no slots left, on this date.</p>
      )}

      {availability && availability.slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availability.slots.map((slot) => (
            <button
              key={slot.start}
              disabled={!slot.available}
              onClick={() => setSelectedSlot(slot.start)}
              className={`rounded-md border px-2 py-1 text-xs ${
                !slot.available
                  ? "cursor-not-allowed border-slate-100 text-slate-300 line-through"
                  : selectedSlot === slot.start
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 hover:border-slate-500"
              }`}
            >
              {new Date(slot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1"
        />
        <button
          onClick={book}
          disabled={!selectedSlot}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Book slot
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
