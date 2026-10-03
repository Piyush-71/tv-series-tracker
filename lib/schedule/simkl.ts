import { getFallbackSchedule } from "@/lib/schedule/fallback";
import type { ScheduleSource } from "@/lib/schedule/service";
import type { ScheduleKind, ScheduledEpisode } from "@/types/schedule";
import { unstable_cache } from "next/cache";

const calendarUrl = "https://data.simkl.in/calendar/tv.json";

type SimklCalendarItem = {
  title?: unknown;
  poster?: unknown;
  date?: unknown;
  rank?: unknown;
  ratings?: { simkl?: { rating?: unknown } };
  url?: unknown;
  ids?: { simkl_id?: unknown; slug?: unknown; tmdb?: unknown };
  episode?: { season?: unknown; episode?: unknown };
};

export const simklScheduleSource: ScheduleSource = {
  list: unstable_cache(loadCalendar, ["simkl-tv-calendar-compact-v1"], { revalidate: 10_800, tags: ["tv-schedule"] }),
};

async function loadCalendar() {
  try {
    const response = await fetch(calendarUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Simkl calendar responded with ${response.status}`);

    const value = (await response.json()) as unknown;
    if (!Array.isArray(value)) throw new Error("Simkl calendar returned an invalid document");

    const items = value.map(toScheduledEpisode).filter((item): item is ScheduledEpisode => Boolean(item));
    if (!items.length) throw new Error("Simkl calendar contained no usable episodes");
    return compactSchedule(items);
  } catch (error) {
    console.error(JSON.stringify({ event: "schedule.simkl_failed", error: String(error) }));
    return getFallbackSchedule();
  }
}

function toScheduledEpisode(value: SimklCalendarItem): ScheduledEpisode | undefined {
  if (
    typeof value.title !== "string" ||
    typeof value.date !== "string" ||
    typeof value.url !== "string" ||
    typeof value.ids?.simkl_id !== "number" ||
    typeof value.ids.slug !== "string" ||
    typeof value.episode?.season !== "number" ||
    typeof value.episode.episode !== "number"
  ) {
    return undefined;
  }

  const airsAt = new Date(value.date);
  if (!Number.isFinite(airsAt.getTime())) return undefined;

  const seasonNumber = value.episode.season;
  const episodeNumber = value.episode.episode;
  const showId = String(value.ids.simkl_id);
  const rank = typeof value.rank === "number" && value.rank > 0 ? value.rank : undefined;
  const ratingValue = value.ratings?.simkl?.rating;
  const rating = typeof ratingValue === "number" ? ratingValue : undefined;
  const poster = typeof value.poster === "string"
    ? `https://simkl.in/posters/${value.poster}_m.jpg`
    : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80";

  return {
    id: `simkl-${showId}-s${seasonNumber}e${episodeNumber}-${airsAt.getTime()}`,
    showId,
    tmdbId: typeof value.ids.tmdb === "string" && value.ids.tmdb ? value.ids.tmdb : undefined,
    title: value.title,
    slug: value.ids.slug,
    poster,
    seasonNumber,
    episodeNumber,
    airsAt: airsAt.toISOString(),
    precision: "datetime",
    kind: getKind(seasonNumber, episodeNumber),
    rank,
    rating,
    sourceUrl: value.url,
  };
}

function getKind(seasonNumber: number, episodeNumber: number): ScheduleKind {
  if (seasonNumber === 1 && episodeNumber === 1) return "series-premiere";
  if (episodeNumber === 1) return "season-premiere";
  return "episode";
}

function compactSchedule(items: ScheduledEpisode[]) {
  const now = Date.now();
  const future = items.filter((item) => new Date(item.airsAt).getTime() >= now);
  const past = items.filter((item) => new Date(item.airsAt).getTime() < now);
  const selectedShows = new Set<string>();

  addShows(selectedShows, future.toSorted(byAirtime), 220);
  addShows(selectedShows, future.filter((item) => item.rank).toSorted((a, b) => (a.rank ?? 999_999) - (b.rank ?? 999_999)), 100);
  addShows(selectedShows, future.filter((item) => item.kind !== "episode").toSorted(byAirtime), 150);
  addShows(selectedShows, past.toSorted((a, b) => byAirtime(b, a)), 150);

  return items.filter((item) => selectedShows.has(item.showId));
}

function addShows(target: Set<string>, items: ScheduledEpisode[], limit: number) {
  let added = 0;
  for (const item of items) {
    if (target.has(item.showId)) continue;
    target.add(item.showId);
    added += 1;
    if (added >= limit) break;
  }
}

function byAirtime(a: ScheduledEpisode, b: ScheduledEpisode) {
  return new Date(a.airsAt).getTime() - new Date(b.airsAt).getTime();
}
