import type { MediaTitle } from "@/types/media";
import type { TrackerData, TrackerReminder } from "@/lib/tracker";
import { isTrackerDate } from "@/lib/tracker-date";

/** Date-only reminders follow the device calendar; they do not invent an airtime. */
export function reminderTiming(
  reminder: Pick<TrackerReminder, "releaseDate" | "leadMinutes">,
  now = new Date(),
): "pending" | "due" | "missed" {
  if (!isTrackerDate(reminder.releaseDate)) return "missed";
  if (!reminder.releaseDate.includes("T")) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const daysUntil =
      (Date.parse(reminder.releaseDate) - Date.parse(today)) / 86_400_000;
    if (daysUntil < 0) return "missed";
    return daysUntil <= Math.floor(reminder.leadMinutes / 1440)
      ? "due"
      : "pending";
  }
  const releaseAt = Date.parse(reminder.releaseDate);
  if (now.getTime() > releaseAt) return "missed";
  return now.getTime() >= releaseAt - reminder.leadMinutes * 60_000
    ? "due"
    : "pending";
}

export function getReminderTarget(
  title: MediaTitle,
  override?: string | null,
  now = new Date(),
): string | null {
  const target =
    override ??
    (title.type === "tv" || title.type === "anime"
      ? title.nextEpisode?.airDate
      : title.releaseDate);
  if (
    !isTrackerDate(target) ||
    reminderTiming({ releaseDate: target, leadMinutes: 0 }, now) === "missed"
  )
    return null;
  return target;
}

export function reconcileReleaseOverride(
  data: TrackerData,
  id: string,
  override: string | null,
  officialTarget?: string | null,
  now = new Date(),
): TrackerData {
  if (override !== null && !isTrackerDate(override)) return data;
  if (
    officialTarget !== undefined &&
    officialTarget !== null &&
    !isTrackerDate(officialTarget)
  )
    return data;
  const releaseOverrides = { ...data.releaseOverrides };
  if (override) releaseOverrides[id] = override;
  else delete releaseOverrides[id];
  const reminders = { ...data.reminders };
  const reminder = reminders[id];
  if (reminder) {
    // Legacy reminders with an existing override have no recoverable original target.
    const originalReleaseDate =
      officialTarget !== undefined
        ? officialTarget
        : reminder.originalReleaseDate !== undefined
          ? reminder.originalReleaseDate
          : data.releaseOverrides[id]
            ? null
            : reminder.releaseDate;
    const releaseDate = override ?? originalReleaseDate;
    if (!releaseDate || !isTrackerDate(releaseDate)) delete reminders[id];
    else
      reminders[id] = {
        ...reminder,
        originalReleaseDate,
        releaseDate,
        status:
          releaseDate === reminder.releaseDate
            ? reminder.status
            : reminderTiming({ ...reminder, releaseDate }, now) === "missed"
              ? "missed"
              : "scheduled",
      };
  }
  return { ...data, releaseOverrides, reminders };
}
