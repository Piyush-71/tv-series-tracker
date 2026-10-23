"use client";

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import {
  getReminderTarget,
  withScheduledNextEpisode,
} from "@/lib/tracker-reminders";
import type { CollectionEntry } from "@/types/collection";
import { cn } from "@/lib/utils";
import { getReleasePresentation } from "@/lib/release";
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
  const [resolvedTitle, setResolvedTitle] = useState<MediaTitle | null>(null);
  const reminder = tracker.data.reminders[title.id];
  const reminderTitle =
    resolvedTitle?.id === title.id && getReminderTarget(resolvedTitle)
      ? resolvedTitle
      : title;
  const releaseDate = getReminderTarget(
    reminderTitle,
    tracker.data.releaseOverrides[title.id],
  );
  const canCheckSchedule =
    !releaseDate && (title.type === "tv" || title.type === "anime");
  const released =
    !releaseDate &&
    getReleasePresentation({
      releaseDate: title.releaseDate,
      releasePrecision: title.releasePrecision,
    }).kind === "released";
  const unavailableReason = !tracker.isReady
    ? "Loading your tracker…"
    : title.type === "tv" || title.type === "anime"
      ? "A future next episode date has not been announced."
      : released
        ? "This title has already been released."
        : "A future release date has not been announced.";

  async function toggle() {
    setFeedback("");
    if (reminder) {
      tracker.setReminder(null, title.id);
      return;
    }

    if ((!releaseDate && !canCheckSchedule) || !tracker.isReady) return;
    setBusy(true);
    try {
      // Request permission from the click itself; a preceding network request
      // loses Safari's required user gesture.
      let browserNotifications = false;
      if (push.mode === "push") {
        const enabled = push.status === "connected" || (await push.enable());
        if (!enabled) {
          setFeedback(
            "Could not enable background notifications. Check notification settings in Profile.",
          );
          return;
        }
        browserNotifications = true;
      } else {
        let permission =
          typeof Notification === "undefined"
            ? "denied"
            : Notification.permission;
        if (permission === "default")
          permission = await Notification.requestPermission();
        browserNotifications = permission === "granted";
      }
      if (!tracker.isCurrentScope()) return;
      let nextTitle = reminderTitle;
      if (canCheckSchedule) {
        const response = await fetch("/api/collection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: [title.id] }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error("Schedule lookup failed");
        const data: { results?: CollectionEntry[] } = await response.json();
        if (!tracker.isCurrentScope()) return;
        const entry = data.results?.find((entry) => entry.id === title.id);
        if (!entry || entry.status !== "ready")
          throw new Error("Schedule lookup unavailable");
        nextTitle = withScheduledNextEpisode(
          entry.title ?? title,
          entry.episode,
        );
        setResolvedTitle(nextTitle);
        if (
          !getReminderTarget(nextTitle, tracker.data.releaseOverrides[title.id])
        ) {
          setFeedback(
            "No upcoming episode date is available right now. Check back later or set a custom time on the title page.",
          );
          return;
        }
      }
      tracker.scheduleReminder(nextTitle, browserNotifications);
    } catch {
      setFeedback(
        canCheckSchedule
          ? "Could not check the episode schedule. Please try again."
          : "Could not enable notifications. Check notification settings in Profile.",
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
          (!reminder && !releaseDate && !canCheckSchedule)
        }
        aria-busy={busy}
        title={
          !tracker.isReady || (!reminder && !releaseDate && !canCheckSchedule)
            ? unavailableReason
            : canCheckSchedule && !reminder
              ? "Check the latest episode schedule and set a reminder."
              : releaseDate && !releaseDate.includes("T")
                ? "Date-only reminder follows your device calendar; exact airtime has not been announced."
                : undefined
        }
        aria-label={
          !tracker.isReady || (!reminder && !releaseDate && !canCheckSchedule)
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
          ? canCheckSchedule
            ? "Checking…"
            : "Enabling…"
          : size === "icon"
            ? null
            : reminder
              ? "Reminder set"
              : canCheckSchedule
                ? "Check next episode"
                : !releaseDate
                  ? released
                    ? "Released"
                    : "Date TBA"
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
