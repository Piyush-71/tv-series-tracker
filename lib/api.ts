import type { TmdbQuery } from "@/lib/tmdb/types";
import type { MediaType } from "@/types/media";

export class ApiInputError extends Error {
  readonly code = "INVALID_QUERY";
}

const types = new Set<MediaType | "all">(["all", "tv", "movie", "anime", "event"]);
const sorts = new Set<TmdbQuery["sort"]>(["popularity", "release_date", "rating", "title"]);
const availabilityValues = new Set<TmdbQuery["availability"]>(["flatrate", "rent", "buy", "free"]);

export function parseTitleQuery(params: URLSearchParams): TmdbQuery {
  const result: TmdbQuery = {};
  const type = params.get("type");
  const query = params.get("q")?.trim();
  const genre = params.get("genre")?.trim();
  const page = parseOptionalInteger(params.get("page"), "Page");
  const year = parseOptionalInteger(params.get("year"), "Year");
  const sort = params.get("sort");
  const country = params.get("country")?.trim().toUpperCase();
  const language = params.get("language")?.trim().toLowerCase();
  const provider = parseOptionalInteger(params.get("provider"), "Provider");
  const availability = params.get("availability");

  if (type) {
    if (!types.has(type as MediaType | "all")) throw new ApiInputError("Unsupported media type");
    result.type = type as MediaType | "all";
  }
  if (query) {
    if (query.length > 100) throw new ApiInputError("Search query is too long");
    result.query = query;
  }
  if (genre) {
    if (genre.length > 50) throw new ApiInputError("Genre is too long");
    result.genre = genre;
  }
  if (page !== undefined) {
    if (page < 1 || page > 500) throw new ApiInputError("Page must be between 1 and 500");
    result.page = page;
  }
  if (year !== undefined) {
    if (year < 1900 || year > 2100) throw new ApiInputError("Year must be between 1900 and 2100");
    result.year = year;
  }
  if (sort) {
    if (!sorts.has(sort as TmdbQuery["sort"])) throw new ApiInputError("Unsupported sort value");
    result.sort = sort as TmdbQuery["sort"];
  }
  if (country) {
    if (!/^[A-Z]{2}$/.test(country)) throw new ApiInputError("Country must be a two-letter code");
    result.country = country;
  }
  if (language) {
    if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(language)) throw new ApiInputError("Language code is invalid");
    result.language = language;
  }
  if (provider !== undefined) {
    if (provider < 1) throw new ApiInputError("Provider must be a positive number");
    result.provider = provider;
  }
  if (availability) {
    if (!availabilityValues.has(availability as TmdbQuery["availability"])) throw new ApiInputError("Unsupported availability value");
    result.availability = availability as TmdbQuery["availability"];
  }

  return result;
}

function parseOptionalInteger(value: string | null, label: string) {
  if (value === null || value === "") return undefined;
  if (!/^\d+$/.test(value)) throw new ApiInputError(`${label} must be a whole number`);
  return Number(value);
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string, now = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      const allowed = bucket.count <= limit;
      return {
        allowed,
        remaining: Math.max(limit - bucket.count, 0),
        retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
      };
    },
  };
}

export const publicApiLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export function getRequestKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
