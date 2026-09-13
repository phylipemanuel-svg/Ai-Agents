import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking Sandbox",
  description: "Fake booking calendars with real, callable APIs — for AI agent demos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
