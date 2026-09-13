"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Calendar, CalendarType } from "@/lib/types";
import { CALENDAR_TYPE_EMOJI, CALENDAR_TYPE_LABELS, TYPE_DEFAULTS } from "@/lib/defaults";

const TYPE_OPTIONS: CalendarType[] = ["dentist", "lawyer", "golf", "estate-agent", "custom"];

export default function DashboardClient({
  initialCalendars,
  persistent,
}: {
  initialCalendars: Calendar[];
  persistent: boolean;
}) {
  const router = useRouter();
  const [calendars, setCalendars] = useState(initialCalendars);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/calendars", { cache: "no-store" });
    const data = await res.json();
    setCalendars(data.calendars);
  }

  async function loadDemoCalendars() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/calendars/seed", { method: "POST" });
      await refresh();
      router.refresh();
    } catch {
      setError("Could not load demo calendars.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCalendar(id: string) {
    if (!confirm("Delete this calendar and all its bookings? This can't be undone.")) return;
    await fetch(`/api/calendars/${id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Booking Sandbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fake businesses, each with a real calendar and a real API. Point your AI agents at
            them for demos.
          </p>
          {!persistent && (
            <p className="mt-2 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No persistent storage connected — bookings live in memory and reset on every
              redeploy or cold start. Connect a Vercel KV database (Storage tab in your Vercel
              project) so demos survive restarts. See the README for steps.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={loadDemoCalendars}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Load demo calendars
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add calendar
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {calendars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No calendars yet. Click "Load demo calendars" for a dentist, lawyer, golf club and
          estate agent, or "Add calendar" to create your own.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {calendars.map((cal) => (
            <div
              key={cal.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Link href={`/calendars/${cal.id}`} className="flex-1">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <span>{CALENDAR_TYPE_EMOJI[cal.type]}</span>
                  <span>{cal.name}</span>
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {CALENDAR_TYPE_LABELS[cal.type]}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {cal.slotMinutes}-min slots &middot; {cal.timezone}
                </div>
              </Link>
              <button
                onClick={() => deleteCalendar(cal.id)}
                className="text-xs text-slate-400 hover:text-red-600"
                title="Delete calendar"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddCalendarModal
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            setShowAdd(false);
            await refresh();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddCalendarModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CalendarType>("dentist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults = TYPE_DEFAULTS[type];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create calendar");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Add a calendar</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Business name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaults.exampleName}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CalendarType)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {CALENDAR_TYPE_EMOJI[t]} {CALENDAR_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">
            Defaults for this type: {defaults.slotMinutes}-minute slots,{" "}
            {defaults.startMinute / 60}:00–{defaults.endMinute / 60}:00, {defaults.timezone}. You
            can fine-tune business hours after creating it.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create calendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
