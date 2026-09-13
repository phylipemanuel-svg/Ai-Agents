import { store, usingPersistentStore } from "@/lib/store";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const calendars = await store.listCalendars();
  return <DashboardClient initialCalendars={calendars} persistent={usingPersistentStore} />;
}
