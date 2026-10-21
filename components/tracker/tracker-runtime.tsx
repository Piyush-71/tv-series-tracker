"use client";

import { WifiOff, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { reminderTiming } from "@/lib/tracker-reminders";
import { trackerThemeStorageKey } from "@/lib/tracker";
import { useTracker } from "@/hooks/use-tracker";

export function TrackerRuntime() {
  const tracker = useTracker();
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const updateReminderStatus = useEffectEvent(tracker.updateReminderStatus);
  const reminders = tracker.data.reminders;
  const isCurrentScope = tracker.isCurrentScope;
  const browserNotifications = tracker.data.preferences.browserNotifications;

  useEffect(() => {
    if (!tracker.isReady) return;
    const preference = tracker.data.preferences.theme;
    try {
      localStorage.setItem(trackerThemeStorageKey, preference);
    } catch {}
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      document.documentElement.classList.toggle(
        "light",
        preference === "light" || (preference === "system" && media.matches),
      );
      document.documentElement.dataset.theme = preference;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [tracker.isReady, tracker.data.preferences.theme]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!tracker.isReady) return;
    const deliverDueReminders = () => {
      if (!isCurrentScope()) return;
      const now = new Date();
      Object.values(reminders).forEach((reminder) => {
        if (reminder.status !== "scheduled") return;
        const timing = reminderTiming(reminder, now);
        if (timing === "pending") return;
        if (timing === "missed") {
          updateReminderStatus(reminder.id, "missed");
          return;
        }

        if (
          browserNotifications &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              reminder.releaseDate.includes("T")
                ? `${reminder.title} is nearly here`
                : `${reminder.title} is scheduled for ${reminder.releaseDate}`,
              {
                body: reminder.releaseDate.includes("T")
                  ? "Your Cinecount release reminder is due."
                  : "Date-only schedule. Exact airtime has not been announced.",
                icon: "/favicon.ico",
              },
            );
            updateReminderStatus(reminder.id, "delivered");
            void fetch("/api/telemetry", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                event: "notification.delivered",
                titleId: reminder.id,
              }),
            });
          } catch {
            void fetch("/api/telemetry", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                event: "notification.failed",
                titleId: reminder.id,
              }),
            });
          }
        }
      });
    };

    deliverDueReminders();
    const interval = window.setInterval(deliverDueReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [tracker.isReady, isCurrentScope, browserNotifications, reminders]);

  if (online || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-20 z-50 flex items-center justify-center gap-2 bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
      role="status"
    >
      <WifiOff size={16} />
      You are offline. Saved tracker data still works; catalog updates will
      resume when connected.
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
      >
        <X size={15} />
      </button>
    </div>
  );
}
