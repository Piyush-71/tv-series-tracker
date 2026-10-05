"use client";

import { useMemo } from "react";
import { useTracker } from "@/hooks/use-tracker";
import { getTimeZones } from "@/lib/timezone";

export function TimezoneSelect({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  const tracker = useTracker();
  const timeZone = tracker.data.preferences.timeZone;
  const zones = useMemo(() => getTimeZones(timeZone), [timeZone]);

  return (
    <select
      id={id}
      aria-label="Timezone"
      value={timeZone}
      onChange={(event) =>
        tracker.setPreferences({ timeZone: event.target.value })
      }
      className={
        className ??
        "min-h-11 min-w-0 max-w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
      }
    >
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
