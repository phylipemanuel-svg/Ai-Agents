# Booking Sandbox

Fake businesses with real, callable booking APIs — for demoing AI agents that
"call in" to a calendar. Each calendar (dentist, lawyer, golf tee times,
estate agent, or any custom business you add) gets its own API key and its
own `/api/v1/:calendarId/...` endpoints, so different agents can each be
pointed at their own calendar. Everything is managed from a small web
dashboard where you can add, edit, or remove calendars at any time.

## Why this fixes the "fake API" problem

A previous "just fake it" API likely lost state because it kept data in a
plain in-memory variable inside a serverless function — on Vercel, each
request can hit a different function instance (or a cold one), so writes
from one request can vanish before the next request reads them.

This project solves that by talking to a hosted **Redis** store (via Vercel's
Marketplace Redis/Upstash integration) for persistence, so bookings survive
across requests, deploys, and cold starts. If you don't connect Redis, it
transparently falls back to an in-memory store so you can still run it
locally without any setup — you'll just lose data on restart, which is fine
for quick local testing but not for a real demo.

## What you get

- **Dashboard** (`/`) — add/remove calendars, one click to "Load demo
  calendars" (dentist, lawyer, golf club, estate agent).
- **Calendar detail page** (`/calendars/:id`) — shows the calendar's API key
  and base URL, ready-to-copy `curl` examples, editable business hours
  (open days, hours, slot length, timezone), a list of bookings, and a
  manual "create test booking" panel so you can demo bookings without
  needing an agent at all.
- **Agent-facing API** (`/api/v1/:calendarId/...`) — authenticated with a
  per-calendar API key:
  - `GET /api/v1/:calendarId/availability?date=YYYY-MM-DD` — open slots for
    a date (omit `date` for the next 7 days).
  - `GET /api/v1/:calendarId/bookings` — list bookings.
  - `POST /api/v1/:calendarId/bookings` — create a booking:
    `{ "start": "2026-09-15T10:00:00.000Z", "customerName": "Jane Doe", "customerContact": "jane@example.com" }`
  - `DELETE /api/v1/:calendarId/bookings/:bookingId` — cancel a booking.

  Authenticate with either header: `x-api-key: <key>` or
  `Authorization: Bearer <key>`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without KV configured, data is stored in
memory for the life of the dev server.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (or run `vercel`).
2. **Add persistent storage:** in your Vercel project, go to
   **Storage → Marketplace**, and add a Redis database (e.g. "Upstash
   Redis"), connecting it to this project. Vercel injects
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`) automatically — no code changes needed, the
   app detects them and switches storage backends on its own.
3. **Protect the dashboard (recommended before a public demo):** set the
   environment variables `ADMIN_PASSWORD` (and optionally `ADMIN_USER`,
   default `admin`) in Vercel's project settings. The whole site except
   `/api/v1/*` (the agent API) will then require HTTP Basic Auth. Leave
   `ADMIN_PASSWORD` unset for an open dashboard (fine for a quick private
   demo link).
4. Redeploy. Visit your dashboard, click "Load demo calendars", open a
   calendar, and copy its API key + base URL into whatever agent config
   needs to call it.

## Adding more calendars/APIs later

Click **+ Add calendar** on the dashboard at any time — give it a name and
a type (dentist / lawyer / golf / estate agent / custom), and it
immediately gets its own API key and endpoints. There's no fixed limit and
no redeploy required.

## Notes on the "fake" part

- Business logic is intentionally simple: fixed business hours, fixed slot
  length, no double-booking. That's enough to look and behave like a real
  scheduling API for a demo.
- There's no real notion of staff members, multiple resources per
  calendar, or payments — add these only if a specific demo needs them.
