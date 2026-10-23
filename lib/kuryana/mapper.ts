import { format, isValid, parse } from "date-fns";
import { isCalendarDate } from "@/lib/browse/query";
import { KuryanaError } from "@/lib/kuryana/client";
import { parseMdlSlug } from "@/lib/kuryana/identity";
import type { MediaEpisode, MediaTitle } from "@/types/media";

type RecordValue = Record<string, unknown>;
export const fallbackImage = "/icon.svg";

export function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(text(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function mdlImage(value: unknown) {
  try {
    const url = new URL(text(value));
    if (url.protocol === "https:" && url.hostname === "i.mydramalist.com" && !url.port && !url.username && !url.password) return url.href;
  } catch { /* Missing or untrusted images use the local placeholder. */ }
  return fallbackImage;
}

const countries: Record<string, { code: string; language: string }> = {
  Chinese: { code: "CN", language: "zh" }, China: { code: "CN", language: "zh" },
  Korean: { code: "KR", language: "ko" }, "South Korea": { code: "KR", language: "ko" },
  Japanese: { code: "JP", language: "ja" }, Japan: { code: "JP", language: "ja" },
  Thai: { code: "TH", language: "th" }, Thailand: { code: "TH", language: "th" },
  Taiwanese: { code: "TW", language: "zh" }, Taiwan: { code: "TW", language: "zh" },
  "Hong Kong": { code: "HK", language: "cn" },
  Filipino: { code: "PH", language: "tl" }, Philippines: { code: "PH", language: "tl" },
};

function country(value: string) {
  return countries[value] ?? Object.entries(countries).find(([name]) => value.startsWith(`${name} `))?.[1];
}

export function mdlDate(value: unknown): string {
  const raw = text(value);
  if (isCalendarDate(raw)) return raw;
  // MDL publishes English calendar dates/ranges, sometimes with only a year.
  const first = raw.split(/\s+-\s+/)[0].replace(/\s+/g, " ");
  if (!/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(first)) return "";
  for (const pattern of ["MMM d, yyyy", "MMMM d, yyyy"]) {
    const date = parse(first, pattern, new Date(2000, 0, 1));
    if (isValid(date)) return format(date, "yyyy-MM-dd");
  }
  return "";
}

function year(value: unknown): number | undefined {
  const parsed = number(value);
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100 ? parsed : undefined;
}

function baseTitle(slug: string, title: string, type: "tv" | "movie"): MediaTitle {
  return {
    id: `mdl-${slug}`, slug: `mdl-${slug}`, title, type, source: "mydramalist",
    sourceUrl: `https://mydramalist.com/${slug}`,
    description: "No synopsis is available yet.", releaseDate: "", releasePrecision: "date",
    genres: [], poster: fallbackImage, backdrop: fallbackImage, trailerUrl: "",
    rating: 0, platform: "", cast: [], popularity: 0,
  };
}

export function mapMdlSearch(value: unknown): MediaTitle | null {
  const item = record(value);
  const slug = text(item.slug);
  const title = text(item.title);
  const label = text(item.type);
  if (!parseMdlSlug(`mdl-${slug}`) || !title || !/\b(Drama|Movie|TV Show|Special)\b/.test(label)) return null;
  const origin = country(label);
  const mapped = baseTitle(slug, title, /\bMovie\b/.test(label) ? "movie" : "tv");
  return {
    ...mapped, releaseYear: year(item.year), poster: mdlImage(item.thumb), backdrop: mdlImage(item.thumb),
    rating: Math.min(number(item.rating), 10),
    originCountries: origin ? [origin.code] : [], originalLanguage: origin?.language,
    episodeCount: Number.parseInt(text(item.series), 10) || undefined,
  };
}

export function mapMdlDetails(value: unknown, slug: string): MediaTitle {
  const envelope = record(value);
  const data = record(envelope.data);
  const details = record(data.details);
  const others = record(data.others);
  const title = text(data.title).replace(/ \(\d{4}\)$/, "");
  if (envelope.error || !title || !text(details.type)) throw new KuryanaError("MyDramaList returned incomplete title details.");
  const origin = country(text(details.country));
  const mapped = baseTitle(slug, title, /Movie/i.test(text(details.type)) ? "movie" : "tv");
  const runtime = text(details.duration);
  const hours = Number(runtime.match(/(\d+)\s*h(?:r|our)/)?.[1] ?? 0);
  const minutes = Number(runtime.match(/(\d+)\s*min/)?.[1] ?? 0);
  return {
    ...mapped, description: text(data.synopsis) || mapped.description,
    releaseDate: mdlDate(details.aired), releaseYear: year(data.year),
    poster: mdlImage(data.poster), backdrop: mdlImage(data.poster),
    genres: strings(others.genres), rating: Math.min(number(data.rating), 10),
    originalLanguage: origin?.language, originCountries: origin ? [origin.code] : [],
    platform: text(details.original_network), runtime: hours * 60 + minutes || undefined,
    certification: text(details.content_rating), creators: strings(others.director),
    episodeCount: Number.parseInt(text(details.episodes), 10) || undefined,
    seasonCount: mapped.type === "tv" ? 1 : undefined,
    cast: (Array.isArray(data.casts) ? data.casts : []).slice(0, 6).flatMap((value) => {
      const person = record(value);
      return text(person.name) ? [{ name: text(person.name), role: "Cast", image: mdlImage(person.profile_image) }] : [];
    }),
  };
}

export function mapMdlEpisodes(value: unknown): MediaEpisode[] {
  const envelope = record(value);
  const data = record(envelope.data);
  if (envelope.error || !Array.isArray(data.episodes)) throw new KuryanaError("MyDramaList returned incomplete episode data.");
  const episodes = data.episodes.flatMap((value) => {
    const item = record(value);
    const episodeNumber = Number(text(item.link).match(/\/episode\/([1-9]\d*)\/?$/)?.[1] ?? text(item.title).match(/Episode\s+([1-9]\d*)/i)?.[1]);
    if (!Number.isSafeInteger(episodeNumber) || episodeNumber < 1) return [];
    return [{
      id: `s1e${episodeNumber}`, name: text(item.title) || `Episode ${episodeNumber}`,
      overview: "", airDate: mdlDate(item.air_date) || undefined,
      seasonNumber: 1, episodeNumber, rating: Math.min(number(item.rating), 10),
      still: mdlImage(item.image) === fallbackImage ? undefined : mdlImage(item.image),
    }];
  });
  return [...new Map(episodes.map((item) => [item.id, item])).values()].sort((a, b) => a.episodeNumber - b.episodeNumber);
}
