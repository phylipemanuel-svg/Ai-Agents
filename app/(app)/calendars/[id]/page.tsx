import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import CalendarDetailClient from "./CalendarDetailClient";

export const dynamic = "force-dynamic";

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const calendar = await store.getCalendar(id);
  if (!calendar) notFound();

  const bookings = await store.listBookings(calendar.id);

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <CalendarDetailClient initialCalendar={calendar} initialBookings={bookings} baseUrl={baseUrl} />
  );
}
