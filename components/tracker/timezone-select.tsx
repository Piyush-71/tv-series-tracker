"use client";

import { useMemo } from "react";
import { useTracker } from "@/hooks/use-tracker";
import { getTimeZones } from "@/lib/timezone";

export function TimezoneSelect({ id, className }: { id?: string; className?: string }) {
  const tracker = useTracker();
  const timeZone = tracker.data.preferences.timeZone;
  const zones = useMemo(() => getTimeZones(timeZone), [timeZone]);

  return (
    <select
      id={id}
      aria-label="Timezone"
      value={timeZone}
      onChange={(event) => tracker.setPreferences({ timeZone: event.target.value })}
      className={className ?? "min-w-0 max-w-full rounded-md border border-white/15 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-violet-300"}
    >
      {zones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
    </select>
  );
}
