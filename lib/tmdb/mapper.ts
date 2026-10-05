import type { MediaEpisode, MediaTitle, MediaType, ReleaseDateOption } from "@/types/media";
import type { TmdbCastMember, TmdbDetails, TmdbEpisode, TmdbGenre, TmdbListItem, TmdbMediaType, TmdbVideo } from "@/lib/tmdb/types";
import { inferReleasePrecision } from "@/lib/release";

const imageBase = "https://image.tmdb.org/t/p";
const fallbackPoster =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80";
const fallbackBackdrop =
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1800&q=85";
const fallbackProfile =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80";

export function tmdbImage(path: string | null | undefined, size = "w780", fallback = fallbackPoster) {
  return path ? `${imageBase}/${size}${path}` : fallback;
}

export function getTmdbMediaType(item: TmdbListItem, fallback: TmdbMediaType = "movie"): TmdbMediaType {
  return item.media_type === "tv" || item.media_type === "movie" ? item.media_type : fallback;
}

export function toMediaType(item: TmdbListItem, fallback?: TmdbMediaType): MediaType {
  const tmdbType = getTmdbMediaType(item, fallback);
  const genres = item.genre_ids ?? ("genres" in item ? (item as TmdbDetails).genres?.map((genre) => genre.id) : undefined) ?? [];
  const isAnime = tmdbType === "tv" && genres.includes(16) && item.origin_country?.includes("JP");

  return isAnime ? "anime" : tmdbType;
}

export function toTmdbSlug(item: TmdbListItem, fallback?: TmdbMediaType) {
  const mediaType = getTmdbMediaType(item, fallback);
  return `${mediaType}-${item.id}`;
}

export function parseTmdbSlug(slug: string): { mediaType: TmdbMediaType; id: string } | null {
  const [mediaType, id] = slug.split("-");
  if ((mediaType === "movie" || mediaType === "tv") && id) return { mediaType, id };
  return null;
}

function getTrailerUrl(videos?: TmdbVideo[]) {
  const video =
    videos?.find((item) => item.site === "YouTube" && item.type === "Trailer" && item.official) ??
    videos?.find((item) => item.site === "YouTube" && item.type === "Trailer") ??
    videos?.find((item) => item.site === "YouTube");

  return video ? `https://www.youtube.com/embed/${video.key}` : "https://www.youtube.com/embed/dQw4w9WgXcQ";
}

function getPlatform(details?: TmdbDetails) {
  const providers = details?.["watch/providers"]?.results?.US;
  const provider = providers?.flatrate?.[0] ?? providers?.buy?.[0] ?? providers?.rent?.[0];
  return provider?.provider_name ?? "TMDB";
}

function getProviders(details?: TmdbDetails) {
  const us = details?.["watch/providers"]?.results?.US;
  const providers = [...(us?.flatrate ?? []), ...(us?.buy ?? []), ...(us?.rent ?? [])];
  return Array.from(new Map(providers.map((provider) => [provider.provider_id, provider])).values()).map((provider) => ({
    id: provider.provider_id,
    name: provider.provider_name,
    logo: provider.logo_path ? tmdbImage(provider.logo_path, "w92") : undefined,
  }));
}

export function toMediaEpisode(episode: TmdbEpisode): MediaEpisode {
  return {
    id: `s${episode.season_number}e${episode.episode_number}`,
    name: episode.name,
    overview: episode.overview || "No episode synopsis is available yet.",
    airDate: episode.air_date,
    episodeNumber: episode.episode_number,
    seasonNumber: episode.season_number,
    runtime: episode.runtime,
    still: episode.still_path ? tmdbImage(episode.still_path, "w780", fallbackBackdrop) : undefined,
    rating: Number((episode.vote_average ?? 0).toFixed(1)),
  };
}

function getReleaseDates(details?: TmdbDetails): ReleaseDateOption[] {
  const usDates = details?.release_dates?.results.find((result) => result.iso_3166_1 === "US")?.release_dates ?? [];
  const kinds: Record<number, ReleaseDateOption["kind"]> = {
    1: "premiere",
    2: "theatrical",
    3: "theatrical",
    4: "digital",
    5: "physical",
    6: "television",
  };
  return usDates.map((release) => ({
    kind: kinds[release.type] ?? "premiere",
    date: release.release_date,
    region: "US",
    note: release.note || undefined,
  }));
}

function getCertification(details?: TmdbDetails) {
  const movieCertification = details?.release_dates?.results
    .find((result) => result.iso_3166_1 === "US")
    ?.release_dates.find((release) => release.certification)?.certification;
  return movieCertification || details?.content_ratings?.results.find((result) => result.iso_3166_1 === "US")?.rating;
}

function mapCast(cast: TmdbCastMember[] = []) {
  return cast.slice(0, 6).map((person) => ({
    name: person.name,
    role: person.character ?? "Cast",
    image: tmdbImage(person.profile_path, "w342", fallbackProfile),
  }));
}

function genreNames(item: TmdbListItem | TmdbDetails, genreMap: Map<number, string>, mediaType: MediaType) {
  if ("genres" in item && item.genres?.length) return item.genres.map((genre) => genre.name);

  const names = (item.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean) as string[];
  if (mediaType === "anime" && !names.includes("Anime")) return ["Anime", ...names];
  return names.length ? names : [mediaType === "movie" ? "Movie" : "TV"];
}

export function toMediaTitle(
  item: TmdbListItem | TmdbDetails,
  genreMap: Map<number, string>,
  fallbackType?: TmdbMediaType,
): MediaTitle {
  const mediaType = toMediaType(item, fallbackType);
  const releaseDate = item.release_date || item.first_air_date || new Date().toISOString();
  const details = "videos" in item || "number_of_seasons" in item ? (item as TmdbDetails) : undefined;
  const usProviders = details?.["watch/providers"]?.results?.US;

  return {
    id: `${getTmdbMediaType(item, fallbackType)}-${item.id}`,
    slug: toTmdbSlug(item, fallbackType),
    title: item.title ?? item.name ?? "Untitled",
    type: mediaType,
    description: item.overview || "No synopsis is available yet.",
    releaseDate,
    releasePrecision: inferReleasePrecision(releaseDate),
    releaseDates: getReleaseDates(details),
    genres: genreNames(item, genreMap, mediaType),
    poster: tmdbImage(item.poster_path, "w780"),
    backdrop: tmdbImage(item.backdrop_path, "w1280", fallbackBackdrop),
    trailerUrl: getTrailerUrl(details?.videos?.results),
    rating: Number((item.vote_average ?? 0).toFixed(1)),
    platform: getPlatform(details),
    cast: mapCast(details?.credits?.cast),
    popularity: item.popularity ?? 0,
    originalLanguage: item.original_language,
    originCountries: item.origin_country ?? [],
    status: details?.status,
    runtime: details?.runtime ?? details?.episode_run_time?.[0],
    certification: getCertification(details),
    creators: details?.created_by?.map((creator) => creator.name) ?? [],
    seasonCount: details?.number_of_seasons,
    episodeCount: details?.number_of_episodes,
    nextEpisode: details?.next_episode_to_air ? toMediaEpisode(details.next_episode_to_air) : undefined,
    providers: getProviders(details),
    providerLink: usProviders?.link,
    homepage: details?.homepage || undefined,
  };
}

export function makeGenreMap(movieGenres: TmdbGenre[], tvGenres: TmdbGenre[]) {
  return new Map([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]));
}
