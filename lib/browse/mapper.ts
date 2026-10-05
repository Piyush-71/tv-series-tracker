import { isCalendarDate } from "@/lib/browse/query";
import { toMediaTitle } from "@/lib/tmdb/mapper";
import type { TmdbDetails, TmdbMediaType } from "@/lib/tmdb/types";
import type { BrowseRecord, BrowseSeason } from "@/lib/browse/types";

export function toBrowseRecord(details: TmdbDetails, genres: Map<number, string>, mediaType: TmdbMediaType): BrowseRecord {
  const title = toMediaTitle(details, genres, mediaType);
  const rawDate = mediaType === "movie" ? details.release_date : details.first_air_date;
  const releaseDate = rawDate && isCalendarDate(rawDate) ? rawDate : null;
  title.releaseDate = releaseDate || "";
  title.originCountries = details.origin_country?.length ? details.origin_country : details.production_countries?.map((country) => country.iso_3166_1) || [];
  const rating = typeof details.vote_average === "number" && details.vote_average > 0 && details.vote_average <= 10 && details.vote_count !== 0 ? details.vote_average : null;
  const popularity = typeof details.popularity === "number" && Number.isFinite(details.popularity) && details.popularity >= 0 ? details.popularity : null;
  const seasons: BrowseSeason[] = (details.seasons || []).flatMap((season) => season.season_number > 0 && season.air_date && isCalendarDate(season.air_date) ? [{ number: season.season_number, premiereDate: season.air_date }] : []);
  if (mediaType === "tv" && releaseDate && !seasons.some((season) => season.number === 1)) seasons.push({ number: 1, premiereDate: releaseDate });
  const next = details.next_episode_to_air;
  const nextEpisode = next && next.season_number > 0 && next.air_date && isCalendarDate(next.air_date) ? { season: next.season_number, date: next.air_date } : null;
  return { title, releaseDate, seasons, nextEpisode, rating, popularity };
}
