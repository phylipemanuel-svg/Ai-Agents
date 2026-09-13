import { CalendarType } from "./types";

export const CALENDAR_TYPE_LABELS: Record<CalendarType, string> = {
  dentist: "Dentist",
  lawyer: "Lawyer",
  golf: "Golf tee times",
  "estate-agent": "Estate agent",
  custom: "Custom",
};

export const CALENDAR_TYPE_EMOJI: Record<CalendarType, string> = {
  dentist: "🦷",
  lawyer: "⚖️",
  golf: "⛳",
  "estate-agent": "🏠",
  custom: "🗓️",
};

interface TypeDefaults {
  slotMinutes: number;
  timezone: string;
  openDays: number[];
  startMinute: number;
  endMinute: number;
  exampleName: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const TYPE_DEFAULTS: Record<CalendarType, TypeDefaults> = {
  dentist: {
    slotMinutes: 30,
    timezone: "Europe/London",
    openDays: WEEKDAYS,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    exampleName: "Bright Smile Dental",
  },
  lawyer: {
    slotMinutes: 60,
    timezone: "Europe/London",
    openDays: WEEKDAYS,
    startMinute: 9 * 60,
    endMinute: 18 * 60,
    exampleName: "Harlow & Associates",
  },
  golf: {
    slotMinutes: 10,
    timezone: "Europe/London",
    openDays: ALL_DAYS,
    startMinute: 7 * 60,
    endMinute: 19 * 60,
    exampleName: "Fairway Golf Club",
  },
  "estate-agent": {
    slotMinutes: 45,
    timezone: "Europe/London",
    openDays: [1, 2, 3, 4, 5, 6],
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    exampleName: "Prime Estates",
  },
  custom: {
    slotMinutes: 30,
    timezone: "Europe/London",
    openDays: WEEKDAYS,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    exampleName: "New Business",
  },
};
