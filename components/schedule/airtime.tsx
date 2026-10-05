"use client";

import { useTracker } from "@/hooks/use-tracker";
import { formatAirtime } from "@/lib/schedule/format";

export function Airtime({ airsAt }: { airsAt: string }) {
  const { data } = useTracker();
  return <time dateTime={airsAt}>{formatAirtime(airsAt, data.preferences.timeZone)}</time>;
}
