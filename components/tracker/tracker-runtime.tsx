"use client";

import { WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTracker } from "@/hooks/use-tracker";

export function TrackerRuntime() {
  const tracker = useTracker();
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const updateReminderStatus = useRef(tracker.updateReminderStatus);
  const reminders = tracker.data.reminders;
  const browserNotifications = tracker.data.preferences.browserNotifications;

  useEffect(() => {
    const preference = tracker.data.preferences.theme;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      document.documentElement.classList.toggle("light", preference === "light" || (preference === "system" && media.matches));
      document.documentElement.dataset.theme = preference;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [tracker.data.preferences.theme]);

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
    const deliverDueReminders = () => {
      const now = Date.now();
      Object.values(reminders).forEach((reminder) => {
        if (reminder.status !== "scheduled") return;
        const releaseAt = new Date(reminder.releaseDate).getTime();
        const notifyAt = releaseAt - reminder.leadMinutes * 60_000;
        if (!Number.isFinite(releaseAt) || now < notifyAt) return;

        if (now > releaseAt) {
          updateReminderStatus.current(reminder.id, "missed");
          return;
        }

        if (browserNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(`${reminder.title} is nearly here`, {
              body: "Your Cinecount release reminder is due.",
              icon: "/favicon.ico",
            });
            updateReminderStatus.current(reminder.id, "delivered");
            void fetch("/api/telemetry", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ event: "notification.delivered", titleId: reminder.id }),
            });
          } catch {
            void fetch("/api/telemetry", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ event: "notification.failed", titleId: reminder.id }),
            });
          }
        }
      });
    };

    deliverDueReminders();
    const interval = window.setInterval(deliverDueReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [browserNotifications, reminders]);

  if (online || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-50 flex items-center justify-center gap-2 bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950" role="status">
      <WifiOff size={16} />
      You are offline. Saved tracker data still works; catalog updates will resume when connected.
      <button onClick={() => setDismissed(true)} aria-label="Dismiss offline notice" className="ml-2 rounded p-1 hover:bg-black/10">
        <X size={15} />
      </button>
    </div>
  );
}
