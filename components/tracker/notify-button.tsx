"use client";

import { Bell, BellOff } from "lucide-react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
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
  const releaseDate = tracker.data.releaseOverrides[title.id] ?? title.releaseDate;

  async function toggle() {
    if (reminder) {
      tracker.setReminder(null, title.id);
      return;
    }

    let permission = typeof Notification === "undefined" ? "denied" : Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();

    tracker.setPreferences({ browserNotifications: permission === "granted" });
    tracker.setReminder(
      {
        id: title.id,
        title: title.title,
        releaseDate,
        leadMinutes: 24 * 60,
        createdAt: new Date().toISOString(),
        status: "scheduled",
      },
      title.id,
    );
  }

  return (
    <Button
      size={size}
      variant={reminder ? "danger" : "secondary"}
      className={cn(compact ? "flex-1" : undefined, className)}
      onClick={toggle}
      aria-label={reminder ? `Cancel reminder for ${title.title}` : `Remind me about ${title.title}`}
    >
      {reminder ? <BellOff size={compact ? 15 : 18} /> : <Bell size={compact ? 15 : 18} />}
      {size === "icon" ? null : reminder ? "Reminder set" : compact ? "Notify" : "Notify Me"}
    </Button>
  );
}
