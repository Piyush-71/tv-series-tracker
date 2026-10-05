import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { hasTmdbCredentials, tmdbFetch } from "@/lib/tmdb/client";
import { simklScheduleSource } from "@/lib/schedule/simkl";
import { calendarDay, filterBrowseRecords } from "@/lib/browse/filter";
import { toBrowseRecord } from "@/lib/browse/mapper";
import type { BrowseInventory, BrowseOptions, BrowsePage, BrowseQuery } from "@/lib/browse/types";
import type { TmdbDetails, TmdbGenre, TmdbListItem, TmdbListResponse, TmdbMediaType } from "@/lib/tmdb/types";

const PAGE_SIZE = 20;
const CALENDAR_LIMIT = 80;
const REVALIDATE = 3600;

export class BrowseSnapshotChanged extends Error {}

const cachedGenreLists = unstable_cache(async () => {
  const [tv, movie] = await Promise.all([
    tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list", { revalidate: REVALIDATE }),
    tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", { revalidate: REVALIDATE }),
  ]);
  return [...movie.genres, ...tv.genres];
}, ["browse-genres-v1"], { revalidate: REVALIDATE });

const defaultOptions: BrowseOptions = {
  countries: [{ code: "US", label: "United States" }, { code: "GB", label: "United Kingdom" }, { code: "IN", label: "India" }, { code: "JP", label: "Japan" }, { code: "KR", label: "South Korea" }, { code: "FR", label: "France" }, { code: "DE", label: "Germany" }, { code: "CA", label: "Canada" }],
  genres: ["Action", "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi & Fantasy", "Science Fiction", "Thriller"],
};

const cachedOptions = unstable_cache(async (): Promise<BrowseOptions> => {
  const [genres, countries] = await Promise.all([
    cachedGenreLists(),
    tmdbFetch<Array<{ iso_3166_1: string; english_name: string }>>("/configuration/countries", { revalidate: REVALIDATE }),
  ]);
  return { genres: [...new Set(genres.map((genre) => genre.name))].sort(), countries: countries.map((country) => ({ code: country.iso_3166_1, label: country.english_name })).sort((a, b) => a.label.localeCompare(b.label)) };
}, ["browse-options-v1"], { revalidate: REVALIDATE });

export async function getBrowseOptions(): Promise<BrowseOptions> {
  if (!hasTmdbCredentials()) return defaultOptions;
  try { return await cachedOptions(); } catch { return defaultOptions; }
}

async function discover(type: TmdbMediaType, params: Record<string, string | number>) {
  return tmdbFetch<TmdbListResponse<TmdbListItem>>(`/discover/${type}`, { params: { include_adult: false, language: "en-US", ...params }, revalidate: REVALIDATE });
}

/** A bounded inventory independent of user filters, to keep all sorts globally consistent. */
async function loadInventory(type: TmdbMediaType): Promise<BrowseInventory> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  const recent = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
  const requests = [
    discover(type, { [`${dateField}.gte`]: recent, [`${dateField}.lte`]: today, sort_by: "popularity.desc", page: 1 }),
    discover(type, { [`${dateField}.gte`]: recent, [`${dateField}.lte`]: today, sort_by: "popularity.desc", page: 2 }),
    discover(type, { [`${dateField}.gte`]: tomorrow, sort_by: `${dateField}.asc`, page: 1 }),
    discover(type, { sort_by: "popularity.desc", page: 1 }),
  ];
  if (type === "tv") {
    requests.push(discover("tv", { "air_date.gte": today, sort_by: "popularity.desc", page: 1 }));
    requests.push(discover("tv", { with_origin_country: "JP", with_genres: 16, sort_by: "popularity.desc", page: 1 }));
  }
  const [responses, genres, calendar] = await Promise.all([
    Promise.allSettled(requests), cachedGenreLists(),
    type === "tv" ? simklScheduleSource.list() : Promise.resolve([]),
  ]);
  const successful = responses.flatMap((response) => response.status === "fulfilled" ? [response.value] : []);
  if (!successful.length) throw new Error("Browse discovery sources unavailable");
  const ids = new Set<number>(successful.flatMap((response) => response.results.map((item) => item.id)));
  // Prefer calendar shows with a nearby premiere, then nearby episodes.
  const calendarShows = [...calendar].sort((a, b) => Number(b.episodeNumber === 1) - Number(a.episodeNumber === 1) || Math.abs(Date.parse(a.airsAt) - now.getTime()) - Math.abs(Date.parse(b.airsAt) - now.getTime()));
  const calendarIds = new Set<number>();
  for (const item of calendarShows) {
    if (calendarIds.size >= CALENDAR_LIMIT) break;
    if (item.tmdbId && /^\d+$/.test(item.tmdbId)) calendarIds.add(Number(item.tmdbId));
  }
  calendarIds.forEach((id) => ids.add(id));
  const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));
  const candidates = [...ids].sort((a, b) => a - b);
  const records: BrowseInventory["records"] = [];
  let failedCount = 0;
  let cursor = 0;
  // Bound concurrency; cache only the compact metadata required for browsing.
  await Promise.all(Array.from({ length: Math.min(8, candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const id = candidates[cursor++];
      try {
        const details = await tmdbFetch<TmdbDetails>(`/${type}/${id}`, { params: { language: "en-US" }, revalidate: REVALIDATE });
        records.push(toBrowseRecord(details, genreMap, type));
      } catch { failedCount += 1; }
    }
  }));
  if (!records.length && candidates.length) throw new Error("Browse title metadata unavailable");
  records.sort((a, b) => a.title.id.localeCompare(b.title.id));
  const snapshot = createHash("sha256").update(JSON.stringify(records)).digest("hex").slice(0, 16);
  return { records, candidateCount: candidates.length, failedCount, snapshot, updatedAt: now.toISOString() };
}

const cachedInventory = unstable_cache(loadInventory, ["browse-inventory-v2"], { revalidate: REVALIDATE, tags: ["browse-inventory"] });
const inFlight = new Map<TmdbMediaType, Promise<BrowseInventory>>();

function getInventory(type: TmdbMediaType) {
  const pending = inFlight.get(type);
  if (pending) return pending;
  const request = cachedInventory(type).finally(() => inFlight.delete(type));
  inFlight.set(type, request);
  return request;
}

export async function getBrowsePage(query: BrowseQuery, now = new Date()): Promise<BrowsePage> {
  if (!hasTmdbCredentials()) {
    return { results: [], totalResults: 0, totalPages: 0, page: query.page, hasMore: false, snapshot: "", coverage: { verifiedTitles: 0, candidateTitles: 0, unavailableTitles: 0, updatedAt: null, configured: false } };
  }
  const inventory = await getInventory(query.mode === "movie" ? "movie" : "tv");
  // Relative date windows can change at local midnight even if the inventory did not.
  const snapshot = createHash("sha256").update(`${inventory.snapshot}:${calendarDay(now, query.timeZone)}:${query.timeZone}`).digest("hex").slice(0, 16);
  if (query.snapshot && query.snapshot !== snapshot) throw new BrowseSnapshotChanged("Browse data changed. Apply filters again to refresh the results.");
  const matches = filterBrowseRecords(inventory.records, query, now);
  return {
    results: matches.slice(0, query.page * PAGE_SIZE), totalResults: matches.length, totalPages: Math.ceil(matches.length / PAGE_SIZE), page: query.page, hasMore: matches.length > query.page * PAGE_SIZE, snapshot,
    coverage: { verifiedTitles: inventory.records.filter((record) => record.title.type === query.mode).length, candidateTitles: inventory.candidateCount, unavailableTitles: inventory.failedCount, updatedAt: inventory.updatedAt, configured: true },
  };
}
