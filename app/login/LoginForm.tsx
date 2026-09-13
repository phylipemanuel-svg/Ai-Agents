"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "Incorrect username or password");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-plum-lighter/40 bg-white p-8 shadow-lg">
      <div className="mb-6 flex justify-center">
        <Image
          src="/brand/flotek-lockup-on-white.png"
          alt="Flotek"
          width={220}
          height={36}
          priority
        />
      </div>
      <h1 className="text-center text-lg font-bold text-plum-darkest">Booking Sandbox</h1>
      <p className="mt-1 text-center text-sm text-violet-darker">Sign in to manage demo calendars.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-plum-darkest">Username</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-md border border-plum-lighter/60 px-3 py-2 text-sm focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-plum-darkest">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-plum-lighter/60 px-3 py-2 text-sm focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-orange-darker">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-dark disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
