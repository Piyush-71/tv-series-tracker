"use client";

import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { useWebPush } from "./web-push-provider";

export function WebPushSettings() {
  const push = useWebPush();
  const tracker = useTracker();
  const enabled = tracker.data.preferences.browserNotifications;
  return (
    <div className="mt-4 space-y-3">
      <p role="status" className="text-sm text-muted">
        {push.mode === "loading"
          ? "Checking notification support…"
          : push.message}
      </p>
      {push.mode === "push" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={push.status === "syncing"}
            onClick={() => void (enabled ? push.disable() : push.enable())}
          >
            {push.status === "syncing"
              ? "Saving notifications…"
              : enabled
                ? "Disable background notifications"
                : "Enable background notifications"}
          </Button>
          {push.status === "error" || (enabled && push.status === "off") ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (push.status === "off") void push.enable();
                else push.retry();
              }}
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : push.mode === "local" ? (
        <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border p-4 text-sm text-foreground">
          Notify while Cinecount is open
          <input
            type="checkbox"
            checked={enabled}
            onChange={async (event) => {
              if (!event.target.checked) {
                tracker.setPreferences({ browserNotifications: false });
                return;
              }
              const permission =
                typeof Notification === "undefined"
                  ? "denied"
                  : await Notification.requestPermission().catch(
                      () => "denied",
                    );
              if (tracker.isCurrentScope())
                tracker.setPreferences({
                  browserNotifications: permission === "granted",
                });
            }}
            className="h-5 w-5 accent-foreground"
          />
        </label>
      ) : null}
    </div>
  );
}
