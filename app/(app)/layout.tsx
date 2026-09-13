import Image from "next/image";
import Link from "next/link";
import { isAuthConfigured } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-violet-darkest">
        {/* Isolated triangle shapes — brand pattern element, kept subtle here. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 opacity-40"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M50 8 L90 78 A6 6 0 0 1 81 87 L19 87 A6 6 0 0 1 10 78 Z"
            stroke="#ac83bb"
            strokeWidth="2.5"
          />
        </svg>
        <svg
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-24 h-24 w-24 opacity-30"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path d="M12 20 L88 50 L12 80 Z" stroke="#99bfaa" strokeWidth="2.5" />
        </svg>

        <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/flotek-mark.png"
              alt=""
              width={28}
              height={35}
              className="h-8 w-auto"
              priority
            />
            <span className="font-sans text-lg font-bold text-white">Flotek</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-sans text-xs font-medium text-white/90">
              Booking Sandbox
            </span>
          </Link>
          {isAuthConfigured() && <LogoutButton />}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
