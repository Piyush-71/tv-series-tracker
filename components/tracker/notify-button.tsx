"use client";

import { Bell, BellOff } from "lucide-react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { getReminderTarget } from "@/lib/tracker-reminders";
import { cn } from "@/lib/utils";

export function NotifyButton({
  title,
  size = "md",
  className,
  compact = false,
}: {
  title: MediaTitle;
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  compact?: boolean;
}) {
  const tracker = useTracker();
  const reminder = tracker.data.reminders[title.id];
  const releaseDate = getReminderTarget(
    title,
    tracker.data.releaseOverrides[title.id],
  );
  const unavailableReason = !tracker.isReady
    ? "Loading your tracker…"
    : title.type === "tv" || title.type === "anime"
      ? "A future next episode date has not been announced."
      : "A future release date has not been announced.";

  async function toggle() {
    if (reminder) {
      tracker.setReminder(null, title.id);
      return;
    }

    if (!releaseDate || !tracker.isReady) return;

    let permission =
      typeof Notification === "undefined" ? "denied" : Notification.permission;
    if (permission === "default")
      permission = await Notification.requestPermission();

    tracker.scheduleReminder(title, permission === "granted");
  }

  return (
    <Button
      size={size}
      variant={reminder ? "danger" : "secondary"}
      className={cn(compact ? "flex-1" : undefined, className)}
      onClick={toggle}
      disabled={!tracker.isReady || (!reminder && !releaseDate)}
      title={
        !tracker.isReady || (!reminder && !releaseDate)
          ? unavailableReason
          : releaseDate && !releaseDate.includes("T")
            ? "Date-only reminder follows your device calendar; exact airtime has not been announced."
            : undefined
      }
      aria-label={
        !tracker.isReady || (!reminder && !releaseDate)
          ? `Reminders unavailable for ${title.title}: ${unavailableReason}`
          : reminder
            ? `Cancel reminder for ${title.title}`
            : `Remind me about ${title.title}`
      }
    >
      {reminder ? (
        <BellOff size={compact ? 15 : 18} />
      ) : (
        <Bell size={compact ? 15 : 18} />
      )}
      {size === "icon"
        ? null
        : reminder
          ? "Reminder set"
          : !releaseDate
            ? "Date TBA"
            : compact
              ? "Notify"
              : "Notify Me"}
    </Button>
  );
}
