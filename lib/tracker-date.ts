/** Tracker dates are calendar dates or ISO timestamps with an explicit offset. */
export function isTrackerDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(
      value,
    );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, offset] = match;
  const calendar = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== `${year}-${month}-${day}`
  )
    return false;
  if (hour === undefined) return true;
  if (+hour > 23 || +minute > 59 || +(second ?? 0) > 59) return false;
  if (offset !== "Z" && (+offset.slice(1, 3) > 23 || +offset.slice(4) > 59))
    return false;
  return Number.isFinite(Date.parse(value));
}

export function isTrackerTimestamp(value: unknown): value is string {
  return isTrackerDate(value) && value.includes("T");
}
