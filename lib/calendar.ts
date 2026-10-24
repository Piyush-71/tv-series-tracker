import { isTrackerDate } from "@/lib/tracker-date";

/** Date-only announcements stay on their published day in every timezone. */
export function calendarDay(
  value: string | undefined,
  timeZone: string,
): string | null {
  if (!isTrackerDate(value)) return null;
  if (!value.includes("T")) return value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function calendarLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" },
) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function monthDays(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const count =
    Math.ceil((((first.getUTCDay() + 6) % 7) + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

/** Unknown days sort last; within a day, known times precede date-only entries. */
export function compareCalendarDates(
  a: string | undefined,
  b: string | undefined,
  timeZone: string,
) {
  const dayA = calendarDay(a, timeZone);
  const dayB = calendarDay(b, timeZone);
  const dayOrder = (dayA ?? "9999").localeCompare(dayB ?? "9999");
  if (dayOrder || !dayA || !dayB) return dayOrder;
  const timeA = a!.includes("T") ? Date.parse(a!) : Infinity;
  const timeB = b!.includes("T") ? Date.parse(b!) : Infinity;
  return timeA === timeB ? 0 : timeA - timeB;
}
