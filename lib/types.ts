export type CalendarType = "dentist" | "lawyer" | "golf" | "estate-agent" | "custom";

export interface Calendar {
  id: string;
  name: string;
  type: CalendarType;
  apiKey: string;
  timezone: string;
  slotMinutes: number;
  /** 0 = Sunday ... 6 = Saturday */
  openDays: number[];
  /** minutes from midnight, local to `timezone` */
  startMinute: number;
  endMinute: number;
  createdAt: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  calendarId: string;
  start: string; // ISO instant
  end: string; // ISO instant
  customerName: string;
  customerContact?: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
  bookingId?: string;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}
