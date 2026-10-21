import { gzipSync, gunzipSync } from "node:zlib";
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

// The full feed exceeds Next's 2 MB data-cache entry limit. Compress the
// server-only cache value rather than dropping shows from followed collections.
const loadCachedCalendar = unstable_cache(
  async () => gzipSync(JSON.stringify(await loadCalendar())).toString("base64"),
  ["simkl-tv-calendar-full-v2"],
  { revalidate: 10_800, tags: ["tv-schedule"] },
);

export const simklScheduleSource: ScheduleSource = {
  async list() {
    const compressed = await loadCachedCalendar();
    return JSON.parse(
      gunzipSync(Buffer.from(compressed, "base64")).toString(),
    ) as ScheduledEpisode[];
  },
};

async function loadCalendar() {
  try {
    const response = await fetch(calendarUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok)
      throw new Error(`Simkl calendar responded with ${response.status}`);

    const value = (await response.json()) as unknown;
    if (!Array.isArray(value))
      throw new Error("Simkl calendar returned an invalid document");

    const items = value
      .map(toScheduledEpisode)
      .filter((item): item is ScheduledEpisode => Boolean(item));
    if (value.length && !items.length)
      throw new Error("Simkl calendar contained no usable episodes");
    return items;
  } catch (error) {
    console.error(
      JSON.stringify({ event: "schedule.simkl_failed", error: String(error) }),
    );
    // Reject failed reads so neither a fictional schedule nor an empty outage is
    // cached as successful live data. Pages use the existing retry boundary.
    throw new Error(
      "The episode schedule is temporarily unavailable. Please try again.",
      { cause: error },
    );
  }
}

function toScheduledEpisode(
  value: SimklCalendarItem,
): ScheduledEpisode | undefined {
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
  const rank =
    typeof value.rank === "number" && value.rank > 0 ? value.rank : undefined;
  const ratingValue = value.ratings?.simkl?.rating;
  const rating = typeof ratingValue === "number" ? ratingValue : undefined;
  const poster =
    typeof value.poster === "string"
      ? `https://simkl.in/posters/${value.poster}_m.jpg`
      : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80";

  return {
    id: `simkl-${showId}-s${seasonNumber}e${episodeNumber}-${airsAt.getTime()}`,
    showId,
    tmdbId:
      typeof value.ids.tmdb === "string" && value.ids.tmdb
        ? value.ids.tmdb
        : undefined,
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
