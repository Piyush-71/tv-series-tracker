import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { hasTmdbCredentials, tmdbFetch } from "@/lib/tmdb/client";
import { browseDateBounds, calendarDay, filterBrowseRecords } from "@/lib/browse/filter";
import { toBrowseRecord } from "@/lib/browse/mapper";
import { browseQueryParams, parseBrowseQuery } from "@/lib/browse/query";
import type { BrowseInventory, BrowseOptions, BrowsePage, BrowseQuery } from "@/lib/browse/types";
import type { TmdbDetails, TmdbGenre, TmdbListItem, TmdbListResponse, TmdbMediaType } from "@/lib/tmdb/types";

const PAGE_SIZE = 20;
// Bound cold-request work. Report a partial selection instead of claiming catalog totals.
const MAX_PAGES_PER_LANGUAGE = 10;
const DISCOVERY_PAGE_BUDGET = 20;
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
  languages: [
    { code: "ar", label: "Arabic" }, { code: "bn", label: "Bengali" },
    { code: "zh", label: "Chinese" }, { code: "en", label: "English" },
    { code: "fr", label: "French" }, { code: "de", label: "German" },
    { code: "gu", label: "Gujarati" }, { code: "hi", label: "Hindi" },
    { code: "it", label: "Italian" }, { code: "ja", label: "Japanese" },
    { code: "kn", label: "Kannada" }, { code: "ko", label: "Korean" },
    { code: "ml", label: "Malayalam" }, { code: "mr", label: "Marathi" },
    { code: "pt", label: "Portuguese" }, { code: "pa", label: "Punjabi" },
    { code: "ru", label: "Russian" }, { code: "es", label: "Spanish" },
    { code: "ta", label: "Tamil" }, { code: "te", label: "Telugu" },
    { code: "th", label: "Thai" }, { code: "tr", label: "Turkish" },
    { code: "ur", label: "Urdu" },
  ],
  genres: ["Action", "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi & Fantasy", "Science Fiction", "Thriller"],
};

const cachedConfiguration = unstable_cache(async () => {
  const [countries, languages] = await Promise.all([
    tmdbFetch<Array<{ iso_3166_1: string; english_name: string }>>("/configuration/countries", { revalidate: REVALIDATE }),
    tmdbFetch<Array<{ iso_639_1: string; english_name: string }>>("/configuration/languages", { revalidate: REVALIDATE }),
  ]);
  return {
    countries: countries.map((country) => ({ code: country.iso_3166_1, label: country.english_name })).sort((a, b) => a.label.localeCompare(b.label)),
    languages: languages.map((language) => ({ code: language.iso_639_1, label: language.english_name || language.iso_639_1 })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}, ["browse-configuration-v1"], { revalidate: REVALIDATE });

async function cachedOptions(): Promise<BrowseOptions> {
  const [genres, configuration] = await Promise.all([cachedGenreLists(), cachedConfiguration()]);
  return { genres: [...new Set(genres.map((genre) => genre.name))].sort(), ...configuration };
}

export async function getBrowseOptions(): Promise<BrowseOptions> {
  if (!hasTmdbCredentials()) return defaultOptions;
  try { return await cachedOptions(); } catch { return defaultOptions; }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, visit: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await visit(items[index]);
    }
  }));
  return results;
}

// Cache compact details independently of the active filters, including DNS-fallback responses.
const cachedTitleRecord = unstable_cache(async (type: TmdbMediaType, id: number) => {
  const details = await tmdbFetch<TmdbDetails>(`/${type}/${id}`, { params: { language: "en-US" }, revalidate: REVALIDATE });
  return toBrowseRecord(details, new Map(), type);
}, ["browse-title-record-v1"], { revalidate: REVALIDATE, tags: ["browse-inventory"] });
const titleRequests = new Map<string, Promise<BrowseInventory["records"][number]>>();

function getTitleRecord(type: TmdbMediaType, id: number) {
  const key = `${type}:${id}`;
  const pending = titleRequests.get(key);
  if (pending) return pending;
  const request = cachedTitleRecord(type, id).finally(() => titleRequests.delete(key));
  titleRequests.set(key, request);
  return request;
}

function hasPremiereSummary(item: TmdbListItem, type: TmdbMediaType) {
  return typeof (type === "movie" ? item.title : item.name) === "string"
    && typeof (type === "movie" ? item.release_date : item.first_air_date) === "string"
    && Array.isArray(item.genre_ids)
    && (type === "movie" || Array.isArray(item.origin_country));
}

type DiscoveryPlan = { path: string; params: Record<string, string | number | boolean> };

const cachedSourcePage = unstable_cache(async (path: string, paramsKey: string) => {
  const params: DiscoveryPlan["params"] = JSON.parse(paramsKey);
  return tmdbFetch<TmdbListResponse<TmdbListItem>>(path, { params, revalidate: REVALIDATE });
}, ["browse-source-page-v1"], { revalidate: REVALIDATE, tags: ["browse-inventory"] });

function discoveryPlans(query: BrowseQuery, genres: TmdbGenre[], today: string): DiscoveryPlan[] {
  const type = query.mode === "movie" ? "movie" : "tv";
  const path = `/${query.query ? "search" : "discover"}/${type}`;
  const params: DiscoveryPlan["params"] = { include_adult: false, language: "en-US" };
  if (query.query) {
    params.query = query.query;
    return [{ path, params }];
  }
  const dateField = type === "movie" ? "primary_release_date" : query.premiere === "new" ? "first_air_date" : "air_date";
  const { from, to } = browseDateBounds(query, today);
  if (from) params[`${dateField}.gte`] = from;
  if (to) params[`${dateField}.lte`] = to;
  if (type === "tv") {
    params.timezone = query.timeZone;
    // A confirmed episode today is still airing; its exact time is unknown here.
    if (query.premiere === "airing") params["air_date.gte"] = today;
  }
  const sortDate = type === "movie" ? "primary_release_date" : "first_air_date";
  const sorts = { newest: `${sortDate}.desc`, oldest: `${sortDate}.asc`, rating: "vote_average.desc", popularity: "popularity.desc", title: type === "movie" ? "title.asc" : "name.asc", next_episode: "popularity.desc" };
  // TMDB cannot sort by a returning season's premiere. Verify and sort locally.
  params.sort_by = type === "tv" && query.premiere !== "new" && ["newest", "oldest"].includes(query.sort) ? "popularity.desc" : sorts[query.sort];
  if (query.countries.length) params.with_origin_country = query.countries.join("|");
  const genreIds = genres.filter((genre) => query.genres.some((value) => value.toLowerCase() === genre.name.toLowerCase())).map((genre) => genre.id);
  if (genreIds.length) params.with_genres = [...new Set(genreIds)].join("|");
  if (query.mode === "anime") {
    params.with_origin_country = "JP";
    params.with_genres = 16;
  }
  if (query.minRating !== null) {
    params["vote_average.gte"] = query.minRating;
    params["vote_count.gte"] = 1;
  }
  // Original language is a single-value TMDB filter. Merge language searches for OR semantics.
  return (query.languages.length ? query.languages : [""]).map((language) => ({ path, params: { ...params, ...(language ? { with_original_language: language } : {}) } }));
}

/** Discover candidates for the actual filters, then verify season metadata before pagination. */
async function loadInventory(queryKey: string, today: string): Promise<BrowseInventory> {
  const query = parseBrowseQuery(new URLSearchParams(queryKey));
  const type: TmdbMediaType = query.mode === "movie" ? "movie" : "tv";
  const now = new Date();
  const genres = await cachedGenreLists();
  const plans = discoveryPlans(query, genres, today);
  const pageLimit = Math.min(MAX_PAGES_PER_LANGUAGE, Math.max(1, Math.floor(DISCOVERY_PAGE_BUDGET / plans.length)));
  let limited = false;
  let failedPages = 0;
  let successfulPages = 0;
  async function fetchPage(plan: DiscoveryPlan, page: number) {
    try {
      const response = await cachedSourcePage(plan.path, JSON.stringify({ ...plan.params, page }));
      successfulPages += 1;
      limited ||= response.total_pages > pageLimit;
      return response;
    } catch {
      failedPages += 1;
      return null;
    }
  }
  // Learn the source page counts once, then fetch independent pages in parallel.
  const firstPages = await mapConcurrent(plans, 4, (plan) => fetchPage(plan, 1));
  const remaining = plans.flatMap((plan, index) => Array.from(
    { length: Math.max(0, Math.min(firstPages[index]?.total_pages || 0, pageLimit) - 1) },
    (_, page) => ({ plan, page: page + 2 }),
  ));
  const otherPages = await mapConcurrent(remaining, 4, ({ plan, page }) => fetchPage(plan, page));
  if (!successfulPages) throw new Error("Browse discovery sources unavailable");
  const items = new Map<number, TmdbListItem>();
  for (const response of [...firstPages, ...otherPages]) {
    for (const item of response?.results || []) if (!items.has(item.id)) items.set(item.id, item);
  }
  const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));
  const candidates = [...items.values()].sort((a, b) => a.id - b.id);
  const summaryIds: string[] = [];
  let failedCount = 0;
  const needsSeasonDetails = type === "tv" && (query.premiere !== "new" || query.sort === "next_episode");
  // Search cannot apply country constraints upstream. Movie discovery can.
  const needsCountryDetails = !!query.query && query.countries.length > 0;
  const loaded = await mapConcurrent(candidates, 8, async (item) => {
    if (!needsSeasonDetails && !needsCountryDetails && hasPremiereSummary(item, type)) {
      const record = toBrowseRecord(item, genreMap, type);
      summaryIds.push(record.title.id);
      return record;
    }
    try { return await getTitleRecord(type, item.id); }
    catch { failedCount += 1; return null; }
  });
  const records = loaded.filter((record) => record !== null);
  if (!records.length && candidates.length) throw new Error("Browse title metadata unavailable");
  records.sort((a, b) => a.title.id.localeCompare(b.title.id));
  const snapshot = createHash("sha256").update(JSON.stringify(records)).digest("hex").slice(0, 16);
  return { records, summaryIds: summaryIds.sort(), candidateCount: candidates.length, failedCount, limited, failedPages, snapshot, updatedAt: now.toISOString() };
}

// Cache leaf requests only. Next.js bypasses existing entries for nested unstable_cache calls.
const inFlight = new Map<string, Promise<BrowseInventory>>();

function getInventory(queryKey: string, today: string) {
  const key = `${queryKey}:${today}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = loadInventory(queryKey, today).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export async function getBrowsePage(query: BrowseQuery, now = new Date(), includeCardDetails = true): Promise<BrowsePage> {
  if (!hasTmdbCredentials()) {
    return { results: [], totalResults: 0, totalPages: 0, page: query.page, hasMore: false, snapshot: "", coverage: { verifiedTitles: 0, candidateTitles: 0, unavailableTitles: 0, updatedAt: null, configured: false } };
  }
  const queryKey = browseQueryParams({ ...query, page: 1, snapshot: undefined }).toString();
  const today = calendarDay(now, query.timeZone);
  const inventory = await getInventory(queryKey, today);
  // Relative date windows can change at local midnight even if the inventory did not.
  const snapshot = createHash("sha256").update(`${inventory.snapshot}:${today}:${queryKey}`).digest("hex").slice(0, 16);
  if (query.snapshot && query.snapshot !== snapshot) throw new BrowseSnapshotChanged("Browse data changed. Apply filters again to refresh the results.");
  const filterQuery = {
    ...query,
    query: "", // TMDB search already matched original/translated/alternative names.
    // Movie list responses omit origin countries, but discovery applied this constraint.
    countries: query.mode === "movie" && !query.query ? [] : query.countries,
  };
  const matches = filterBrowseRecords(inventory.records, filterQuery, now);
  const summaryIds = new Set(inventory.summaryIds);
  let unavailableDetails = 0;
  // Fetch card-only countries and next episodes for the visible prefix, not the full inventory.
  const results = await mapConcurrent(matches.slice(0, query.page * PAGE_SIZE), 8, async (result) => {
    if (!summaryIds.has(result.title.id)) return result;
    if (!includeCardDetails) return { ...result, detailsPending: true };
    try {
      const type = query.mode === "movie" ? "movie" : "tv";
      const detail = await getTitleRecord(type, Number(result.title.id.slice(type.length + 1)));
      const nextDate = detail.nextEpisode ? calendarDay(detail.nextEpisode.date, query.timeZone) : "";
      return {
        ...result,
        title: { ...result.title, originCountries: detail.title.originCountries },
        nextEpisodeDate: nextDate >= today ? nextDate : null,
      };
    } catch {
      unavailableDetails += 1;
      return result; // Valid source metadata is enough to keep this matching title visible.
    }
  });
  return {
    results, detailsPending: results.some((result) => result.detailsPending), totalResults: matches.length, totalPages: Math.ceil(matches.length / PAGE_SIZE), page: query.page, hasMore: matches.length > query.page * PAGE_SIZE, snapshot,
    coverage: { verifiedTitles: inventory.records.filter((record) => record.title.type === query.mode).length, candidateTitles: inventory.candidateCount, unavailableTitles: inventory.failedCount + unavailableDetails, limited: inventory.limited, unavailablePages: inventory.failedPages, updatedAt: inventory.updatedAt, configured: true },
  };
}
