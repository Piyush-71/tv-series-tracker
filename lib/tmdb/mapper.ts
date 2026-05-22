import type { MediaTitle, MediaType } from "@/types/media";
import type { TmdbCastMember, TmdbDetails, TmdbGenre, TmdbListItem, TmdbMediaType, TmdbVideo } from "@/lib/tmdb/types";

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
  const genres = item.genre_ids ?? [];
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

  return {
    id: `${getTmdbMediaType(item, fallbackType)}-${item.id}`,
    slug: toTmdbSlug(item, fallbackType),
    title: item.title ?? item.name ?? "Untitled",
    type: mediaType,
    description: item.overview || "No synopsis is available yet.",
    releaseDate,
    genres: genreNames(item, genreMap, mediaType),
    poster: tmdbImage(item.poster_path, "w780"),
    backdrop: tmdbImage(item.backdrop_path, "w1280", fallbackBackdrop),
    trailerUrl: getTrailerUrl("videos" in item ? item.videos?.results : undefined),
    rating: Number((item.vote_average ?? 0).toFixed(1)),
    platform: getPlatform("videos" in item ? item : undefined),
    cast: mapCast("credits" in item ? item.credits?.cast : undefined),
    popularity: item.popularity ?? 0,
  };
}

export function makeGenreMap(movieGenres: TmdbGenre[], tvGenres: TmdbGenre[]) {
  return new Map([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name]));
}
