import { createHash } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import type { PushSubscription } from "web-push";
import { isTrackerDate, isTrackerTimestamp } from "@/lib/tracker-date";
import type { TrackerReminder } from "@/lib/tracker";

export class PushInputError extends Error {}

export type PushSnapshot = {
  deviceToken: string;
  userId: string;
  subscription: PushSubscription;
  timeZone: string;
  reminders: TrackerReminder[];
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PushInputError("Expected an object.");
  return value as Record<string, unknown>;
}

export function parseDeviceToken(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))
    throw new PushInputError("Invalid device token.");
  return value;
}

export function deviceId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parsePushSnapshot(value: unknown): PushSnapshot {
  const input = object(value);
  const subscription = object(input.subscription);
  const keys = object(subscription.keys);
  let url: URL;
  try {
    url = new URL(String(subscription.endpoint));
  } catch {
    throw new PushInputError("Invalid push endpoint.");
  }
  // Only send to browser vendors, never arbitrary client-supplied URLs.
  const allowed =
    url.hostname === "fcm.googleapis.com" ||
    url.hostname === "updates.push.services.mozilla.com" ||
    url.hostname.endsWith(".push.services.mozilla.com") ||
    url.hostname === "web.push.apple.com" ||
    url.hostname.endsWith(".push.apple.com") ||
    url.hostname.endsWith(".notify.windows.com");
  if (
    !allowed ||
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    url.href.length > 2048
  )
    throw new PushInputError("Unsupported push endpoint.");
  if (
    typeof keys.p256dh !== "string" ||
    !/^[\w-]{87}=?$/.test(keys.p256dh) ||
    Buffer.from(keys.p256dh, "base64url").length !== 65 ||
    typeof keys.auth !== "string" ||
    !/^[\w-]{22}(==)?$/.test(keys.auth)
  )
    throw new PushInputError("Invalid subscription keys.");
  if (typeof input.userId !== "string" || input.userId.length > 200)
    throw new PushInputError("Invalid account.");
  if (typeof input.timeZone !== "string" || input.timeZone.length > 100)
    throw new PushInputError("Invalid timezone.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format();
  } catch {
    throw new PushInputError("Invalid timezone.");
  }
  if (!Array.isArray(input.reminders) || input.reminders.length > 200)
    throw new PushInputError("At most 200 reminders can be synced per device.");
  const ids = new Set<string>();
  const reminders = input.reminders.map((value) => {
    const reminder = object(value);
    if (
      typeof reminder.id !== "string" ||
      !/^[\w-]{1,150}$/.test(reminder.id) ||
      ids.has(reminder.id) ||
      typeof reminder.title !== "string" ||
      !reminder.title.trim() ||
      reminder.title.length > 200 ||
      !isTrackerDate(reminder.releaseDate) ||
      !isTrackerTimestamp(reminder.createdAt) ||
      typeof reminder.leadMinutes !== "number" ||
      !Number.isInteger(reminder.leadMinutes) ||
      reminder.leadMinutes < 0 ||
      reminder.leadMinutes > 43_200 ||
      !["scheduled", "delivered", "missed"].includes(String(reminder.status))
    )
      throw new PushInputError("Invalid reminder.");
    ids.add(reminder.id);
    return {
      id: reminder.id,
      title: reminder.title,
      releaseDate: reminder.releaseDate,
      createdAt: reminder.createdAt,
      leadMinutes: reminder.leadMinutes,
      status: reminder.status as TrackerReminder["status"],
    };
  });
  return {
    deviceToken: parseDeviceToken(input.deviceToken),
    userId: input.userId,
    subscription: {
      endpoint: url.href,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    },
    timeZone: input.timeZone,
    reminders,
  };
}

export function pushJob(reminder: TrackerReminder, timeZone: string) {
  const exact = reminder.releaseDate.includes("T");
  const calendarDay = Date.parse(reminder.releaseDate);
  const dueDay = new Date(
    calendarDay - Math.floor(reminder.leadMinutes / 1440) * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const nextDay = new Date(calendarDay + 86_400_000).toISOString().slice(0, 10);
  const dueAt = exact
    ? new Date(calendarDay - reminder.leadMinutes * 60_000)
    : fromZonedTime(`${dueDay}T00:00:00`, timeZone);
  const expiresAt = exact
    ? new Date(calendarDay)
    : fromZonedTime(`${nextDay}T00:00:00`, timeZone);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify([
        reminder.id,
        reminder.releaseDate,
        reminder.leadMinutes,
        reminder.createdAt,
        exact ? null : timeZone,
      ]),
    )
    .digest("hex");
  return {
    reminder_id: reminder.id,
    title: reminder.title,
    release_date: reminder.releaseDate,
    fingerprint,
    due_at: dueAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: reminder.status,
  };
}
