import { normalizeTimeZone } from "@/lib/timezone";
import type { BrowseMode, BrowseQuery, BrowseSort, DateRange, PremiereFilter } from "@/lib/browse/types";

export class BrowseInputError extends Error {}

export function defaultBrowseQuery(mode: BrowseMode = "tv", timeZone = "UTC"): BrowseQuery {
  return { mode, premiere: "new", countries: [], genres: [], query: "", range: "30", from: "", to: "", minRating: null, sort: "newest", timeZone, page: 1 };
}

function enumValue<T extends string>(value: string | null, values: readonly T[], fallback: T, label: string): T {
  if (!value) return fallback;
  const match = values.find((candidate) => candidate === value);
  if (!match) throw new BrowseInputError(`Unsupported ${label}.`);
  return match;
}

export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function parseBrowseQuery(params: URLSearchParams, fallbackTimeZone = "UTC"): BrowseQuery {
  const mode = enumValue<BrowseMode>(params.get("type"), ["tv", "anime", "movie"], "tv", "content type");
  const result = defaultBrowseQuery(mode, normalizeTimeZone(params.get("tz") || fallbackTimeZone));
  result.premiere = mode === "movie" ? "new" : enumValue<PremiereFilter>(params.get("premiere"), ["new", "returning", "airing"], "new", "premiere type");
  result.range = result.premiere === "airing" ? "all" : enumValue<DateRange>(params.get("range"), ["7", "30", "90", "upcoming", "custom", "all"], "30", "date range");
  result.sort = enumValue<BrowseSort>(params.get("sort"), ["newest", "oldest", "next_episode", "rating", "popularity", "title"], "newest", "sort order");
  if (mode === "movie" && result.sort === "next_episode") result.sort = "newest";
  result.query = params.get("q")?.trim() || "";
  if (result.query.length > 100) throw new BrowseInputError("Search must be 100 characters or fewer.");
  result.countries = [...new Set(params.getAll("country").flatMap((value) => value.split(",")).filter(Boolean).map((value) => value.toUpperCase()))];
  if (result.countries.length > 30 || result.countries.some((value) => !/^[A-Z]{2}$/.test(value))) throw new BrowseInputError("Choose valid country codes (up to 30).");
  result.genres = [...new Set(params.getAll("genre").map((value) => value.trim()).filter(Boolean))];
  if (result.genres.length > 30 || result.genres.some((value) => value.length > 50)) throw new BrowseInputError("Choose valid genres (up to 30).");
  if (result.range === "custom") {
    result.from = params.get("from") || "";
    result.to = params.get("to") || "";
    if (!isCalendarDate(result.from) || !isCalendarDate(result.to)) throw new BrowseInputError("Choose valid start and end dates.");
    if (result.from > result.to) throw new BrowseInputError("Start date must be on or before end date.");
  }
  const rating = params.get("minRating");
  if (rating !== null && rating !== "") {
    if (!/^\d+(\.\d+)?$/.test(rating) || Number(rating) > 10) throw new BrowseInputError("Minimum rating must be between 0 and 10.");
    result.minRating = Number(rating);
  }
  const page = params.get("page");
  if (page !== null) {
    if (!/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 500) throw new BrowseInputError("Page must be between 1 and 500.");
    result.page = Number(page);
  }
  const snapshot = params.get("snapshot");
  if (snapshot) {
    if (!/^[a-f0-9]{16}$/.test(snapshot)) throw new BrowseInputError("Invalid browse snapshot.");
    result.snapshot = snapshot;
  }
  return result;
}

export function browseQueryParams(query: BrowseQuery): URLSearchParams {
  const params = new URLSearchParams({ type: query.mode, sort: query.sort, tz: query.timeZone });
  if (query.mode !== "movie") params.set("premiere", query.premiere);
  if (query.premiere !== "airing" || query.mode === "movie") {
    params.set("range", query.range);
    if (query.range === "custom") { params.set("from", query.from); params.set("to", query.to); }
  }
  if (query.query.trim()) params.set("q", query.query.trim());
  query.countries.forEach((country) => params.append("country", country));
  query.genres.forEach((genre) => params.append("genre", genre));
  if (query.minRating !== null) params.set("minRating", String(query.minRating));
  if (query.page > 1) params.set("page", String(query.page));
  if (query.snapshot) params.set("snapshot", query.snapshot);
  return params;
}
