import type { ScheduledEpisode } from "@/types/schedule";

export function formatAirtime(airsAt: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(airsAt));
}

export function getScheduleTrackerId(item: Pick<ScheduledEpisode, "showId" | "tmdbId">) {
  return item.tmdbId ? `tv-${item.tmdbId}` : `simkl-${item.showId}`;
}
