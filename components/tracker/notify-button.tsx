"use client";

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { getReminderTarget } from "@/lib/tracker-reminders";
import { cn } from "@/lib/utils";
import { useWebPush } from "./web-push-provider";

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
  const push = useWebPush();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
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
    setFeedback("");
    if (reminder) {
      tracker.setReminder(null, title.id);
      return;
    }

    if (!releaseDate || !tracker.isReady) return;
    setBusy(true);
    try {
      if (push.mode === "push") {
        const enabled = push.status === "connected" || (await push.enable());
        if (!enabled) {
          setFeedback(
            "Could not enable background notifications. Check notification settings in Profile.",
          );
          return;
        }
        tracker.scheduleReminder(title, true);
      } else {
        let permission =
          typeof Notification === "undefined"
            ? "denied"
            : Notification.permission;
        if (permission === "default")
          permission = await Notification.requestPermission();
        tracker.scheduleReminder(title, permission === "granted");
      }
    } catch {
      setFeedback(
        "Could not enable notifications. Check notification settings in Profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size={size}
        variant={reminder ? "danger" : "secondary"}
        className={cn(compact ? "flex-1" : undefined, className)}
        onClick={toggle}
        disabled={
          busy ||
          push.mode === "loading" ||
          !tracker.isReady ||
          (!reminder && !releaseDate)
        }
        aria-busy={busy}
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
        {busy && size !== "icon"
          ? "Enabling…"
          : size === "icon"
            ? null
            : reminder
              ? "Reminder set"
              : !releaseDate
                ? "Date TBA"
                : compact
                  ? "Notify"
                  : "Notify Me"}
      </Button>
      {feedback ? (
        <span role="status" className="text-sm text-danger">
          {feedback}
        </span>
      ) : null}
    </>
  );
}
