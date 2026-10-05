import { isCalendarDate } from "@/lib/browse/query";
import type { BrowseQuery, BrowseRecord, BrowseResult } from "@/lib/browse/types";

export function calendarDay(value: string | Date, timeZone: string): string {
  if (typeof value === "string" && isCalendarDate(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function shiftDay(day: string, amount: number) {
  return new Date(Date.parse(day) + amount * 86_400_000).toISOString().slice(0, 10);
}

function dateMatches(date: string, query: BrowseQuery, today: string) {
  if (!isCalendarDate(date)) return false;
  if (query.range === "all" || query.premiere === "airing" && query.mode !== "movie") return true;
  if (query.range === "upcoming") return date > today;
  if (query.range === "custom") return date >= query.from && date <= query.to;
  return date >= shiftDay(today, 1 - Number(query.range)) && date <= today;
}

function optionalCompare(a: number | null, b: number | null, descending = false): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}

/** Select a matching season, deduplicate titles, then sort before slicing any pages. */
export function filterBrowseRecords(records: BrowseRecord[], query: BrowseQuery, now = new Date()): BrowseResult[] {
  const today = calendarDay(now, query.timeZone);
  const results: BrowseResult[] = [];
  for (const record of records) {
    const title = record.title;
    if (title.type !== query.mode) continue;
    if (query.query && !title.title.toLocaleLowerCase().includes(query.query.toLocaleLowerCase())) continue;
    if (query.countries.length && !query.countries.some((country) => title.originCountries?.includes(country))) continue;
    if (query.genres.length && !query.genres.some((genre) => title.genres.some((value) => value.toLowerCase() === genre.toLowerCase()))) continue;
    if (query.minRating !== null && (record.rating === null || record.rating < query.minRating)) continue;

    const nextDate = record.nextEpisode ? calendarDay(record.nextEpisode.date, query.timeZone) : "";
    let date: string | undefined;
    let season: number | null = null;
    if (query.mode === "movie") {
      date = record.releaseDate ? calendarDay(record.releaseDate, query.timeZone) : undefined;
      if (!date || !dateMatches(date, query, today)) continue;
    } else {
      const matches = record.seasons.filter((item) => {
        const premiere = calendarDay(item.premiereDate, query.timeZone);
        if (item.number < 1 || !premiere) return false;
        if (query.premiere === "airing") {
          return premiere <= today && record.nextEpisode?.season === item.number && nextDate > today;
        }
        return (query.premiere === "new" ? item.number === 1 : item.number > 1) && dateMatches(premiere, query, today);
      }).sort((a, b) => b.premiereDate.localeCompare(a.premiereDate) || b.number - a.number);
      if (!matches.length) continue;
      season = matches[0].number;
      date = calendarDay(matches[0].premiereDate, query.timeZone);
    }
    results.push({ title, date, season, nextEpisodeDate: nextDate > today ? nextDate : null, rating: record.rating, popularity: record.popularity });
  }
  const unique = [...new Map(results.map((result) => [result.title.id, result])).values()];
  return unique.sort((a, b) => {
    let difference = 0;
    switch (query.sort) {
      case "newest": difference = b.date.localeCompare(a.date); break;
      case "oldest": difference = a.date.localeCompare(b.date); break;
      case "next_episode": difference = optionalCompare(a.nextEpisodeDate ? Date.parse(a.nextEpisodeDate) : null, b.nextEpisodeDate ? Date.parse(b.nextEpisodeDate) : null); break;
      case "rating": difference = optionalCompare(a.rating, b.rating, true); break;
      case "popularity": difference = optionalCompare(a.popularity, b.popularity, true); break;
      case "title": difference = a.title.title.localeCompare(b.title.title); break;
    }
    return difference || a.title.title.localeCompare(b.title.title) || a.title.id.localeCompare(b.title.id);
  });
}
