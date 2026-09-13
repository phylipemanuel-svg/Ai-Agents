"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
    >
      Log out
    </button>
  );
}
