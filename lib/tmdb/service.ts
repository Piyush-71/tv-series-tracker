import { cache } from "react";
import { mediaTitles as fallbackTitles } from "@/data/media";
import type { MediaTitle } from "@/types/media";
import { tmdbFetch, hasTmdbCredentials } from "@/lib/tmdb/client";
import { makeGenreMap, parseTmdbSlug, toMediaTitle } from "@/lib/tmdb/mapper";
import type { CatalogGroup, TmdbDetails, TmdbGenre, TmdbListItem, TmdbListResponse, TmdbMediaType, TmdbQuery } from "@/lib/tmdb/types";

const today = new Date().toISOString().slice(0, 10);

async function getGenres() {
  const [movie, tv] = await Promise.all([
    tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", { revalidate: 60 * 60 * 24 * 7 }),
    tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list", { revalidate: 60 * 60 * 24 * 7 }),
  ]);

  return makeGenreMap(movie.genres, tv.genres);
}

async function getList(path: string, fallbackType?: TmdbMediaType, params: Record<string, string | number | boolean | undefined> = {}) {
  const [response, genreMap] = await Promise.all([
    tmdbFetch<TmdbListResponse<TmdbListItem>>(path, {
      params: { language: "en-US", page: 1, ...params },
      revalidate: 60 * 30,
    }),
    getGenres(),
  ]);

  return response.results
    .filter((item) => item.poster_path && item.backdrop_path)
    .map((item) => toMediaTitle(item, genreMap, fallbackType));
}

export const getCatalog = cache(async (): Promise<CatalogGroup> => {
  if (!hasTmdbCredentials()) {
    return getFallbackCatalog();
  }

  try {
    const [trending, movies, tv, anime, anticipated] = await Promise.all([
      getList("/trending/all/week"),
      getList("/movie/upcoming", "movie", { region: "US" }),
      getList("/discover/tv", "tv", { sort_by: "popularity.desc", "first_air_date.gte": today }),
      getList("/discover/tv", "tv", {
        sort_by: "popularity.desc",
        with_genres: 16,
        with_origin_country: "JP",
        "first_air_date.gte": today,
      }),
      getList("/discover/movie", "movie", {
        sort_by: "popularity.desc",
        "primary_release_date.gte": today,
        "vote_average.gte": 6,
        region: "US",
      }),
    ]);

    const merged = uniqueById([...trending, ...movies, ...tv, ...anime, ...anticipated]);

    return {
      featured: merged[0] ?? fallbackTitles[0],
      trending,
      thisWeek: merged.filter((item) => {
        const release = new Date(item.releaseDate).getTime();
        const now = Date.now();
        return release >= now && release <= now + 7 * 24 * 60 * 60 * 1000;
      }),
      anticipated,
      anime,
      movies,
      tv,
    };
  } catch (error) {
    console.error("TMDB catalog fetch failed; using fallback catalog.", error);
    return getFallbackCatalog();
  }
});

export async function getAllTitles() {
  const catalog = await getCatalog();
  return uniqueById([
    ...catalog.trending,
    ...catalog.movies,
    ...catalog.tv,
    ...catalog.anime,
    ...catalog.anticipated,
  ]);
}

export const getTitleBySlug = cache(async (slug: string) => {
  if (!hasTmdbCredentials()) {
    return fallbackTitles.find((title) => title.slug === slug);
  }

  const parsed = parseTmdbSlug(slug);
  if (!parsed) return undefined;

  try {
    const genreMap = await getGenres();
    const details = await tmdbFetch<TmdbDetails>(`/${parsed.mediaType}/${parsed.id}`, {
      params: { append_to_response: "videos,credits,watch/providers,similar", language: "en-US" },
      revalidate: 60 * 60,
    });

    return toMediaTitle(details, genreMap, parsed.mediaType);
  } catch (error) {
    console.error(`TMDB title fetch failed for ${slug}; using catalog copy when available.`, error);
    return findKnownTitle(slug);
  }
});

export async function getSimilarTitles(slug: string) {
  const parsed = parseTmdbSlug(slug);
  if (!parsed || !hasTmdbCredentials()) return fallbackTitles.slice(0, 6);

  try {
    const [details, genreMap] = await Promise.all([
      tmdbFetch<TmdbDetails>(`/${parsed.mediaType}/${parsed.id}`, {
        params: { append_to_response: "similar", language: "en-US" },
        revalidate: 60 * 60,
      }),
      getGenres(),
    ]);

    return (details.similar?.results ?? [])
      .filter((item) => item.poster_path && item.backdrop_path)
      .slice(0, 10)
      .map((item) => toMediaTitle(item, genreMap, parsed.mediaType));
  } catch (error) {
    console.error(`TMDB similar-title fetch failed for ${slug}; using catalog recommendations.`, error);
    const title = await findKnownTitle(slug);
    const catalog = await getAllTitles();

    return catalog
      .filter((item) => item.slug !== slug)
      .filter((item) => !title || item.type === title.type || item.genres.some((genre) => title.genres.includes(genre)))
      .slice(0, 10);
  }
}

export async function searchTitles(query: string) {
  if (!hasTmdbCredentials()) {
    const value = query.trim().toLowerCase();
    if (!value) return fallbackTitles;
    return fallbackTitles.filter((title) =>
      [title.title, title.description, title.type, title.platform, ...title.genres].join(" ").toLowerCase().includes(value),
    );
  }

  if (!query.trim()) return getAllTitles();

  const [response, genreMap] = await Promise.all([
    tmdbFetch<TmdbListResponse<TmdbListItem>>("/search/multi", {
      params: { query, include_adult: false, language: "en-US", page: 1 },
      revalidate: 60 * 10,
    }),
    getGenres(),
  ]);

  return response.results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .filter((item) => item.poster_path && item.backdrop_path)
    .map((item) => toMediaTitle(item, genreMap));
}

export async function getTitlesByQuery(query: TmdbQuery = {}) {
  const items = query.query ? await searchTitles(query.query) : await getAllTitles();

  return items
    .filter((item) => !query.type || query.type === "all" || item.type === query.type)
    .filter((item) => !query.genre || item.genres.some((genre) => genre.toLowerCase() === query.genre?.toLowerCase()))
    .sort((a, b) => b.popularity - a.popularity);
}

export async function getGenresFromCatalog() {
  const items = await getAllTitles();
  return Array.from(new Set(items.flatMap((item) => item.genres))).sort();
}

function uniqueById(items: MediaTitle[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function getFallbackCatalog(): CatalogGroup {
  const sorted = [...fallbackTitles].sort((a, b) => b.popularity - a.popularity);
  return {
    featured: sorted[0],
    trending: sorted,
    thisWeek: fallbackTitles.filter((item) => new Date(item.releaseDate) < new Date("2026-06-01")),
    anticipated: fallbackTitles.filter((item) => item.rating >= 8.7),
    anime: fallbackTitles.filter((item) => item.type === "anime"),
    movies: fallbackTitles.filter((item) => item.type === "movie"),
    tv: fallbackTitles.filter((item) => item.type === "tv"),
  };
}

async function findKnownTitle(slug: string) {
  const fallbackTitle = fallbackTitles.find((title) => title.slug === slug);
  if (fallbackTitle) return fallbackTitle;

  const catalog = await getAllTitles();
  return catalog.find((title) => title.slug === slug);
}
