import type { MediaType } from "@/types/media";

export type TmdbMediaType = "movie" | "tv";

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbListResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbListItem = {
  id: number;
  media_type?: TmdbMediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
  origin_country?: string[];
  original_language?: string;
};

export type TmdbVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

export type TmdbWatchProviders = {
  results?: Record<string, { link?: string; flatrate?: TmdbProvider[]; buy?: TmdbProvider[]; rent?: TmdbProvider[] }>;
};

export type TmdbEpisode = {
  id: number;
  name: string;
  overview?: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  runtime?: number;
  still_path?: string | null;
  vote_average?: number;
};

export type TmdbSeason = {
  id: number;
  name: string;
  overview?: string;
  season_number: number;
  air_date?: string;
  episodes: TmdbEpisode[];
};

export type TmdbReleaseDate = {
  certification?: string;
  iso_639_1?: string | null;
  note?: string;
  release_date: string;
  type: number;
};

export type TmdbDetails = TmdbListItem & {
  genres?: TmdbGenre[];
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
  "watch/providers"?: TmdbWatchProviders;
  similar?: TmdbListResponse<TmdbListItem>;
  runtime?: number;
  episode_run_time?: number[];
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  homepage?: string;
  created_by?: Array<{ id: number; name: string }>;
  next_episode_to_air?: TmdbEpisode | null;
  release_dates?: { results: Array<{ iso_3166_1: string; release_dates: TmdbReleaseDate[] }> };
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
};

export type CatalogGroup = {
  featured: import("@/types/media").MediaTitle;
  trending: import("@/types/media").MediaTitle[];
  thisWeek: import("@/types/media").MediaTitle[];
  anticipated: import("@/types/media").MediaTitle[];
  anime: import("@/types/media").MediaTitle[];
  movies: import("@/types/media").MediaTitle[];
  tv: import("@/types/media").MediaTitle[];
};

export type TmdbQuery = {
  type?: MediaType | "all";
  genre?: string;
  query?: string;
  page?: number;
  year?: number;
  sort?: "popularity" | "release_date" | "rating" | "title";
  country?: string;
  language?: string;
  provider?: number;
  availability?: "flatrate" | "rent" | "buy" | "free";
};

export type DiscoveryPage = {
  results: import("@/types/media").MediaTitle[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type DiscoveryFilters = {
  genres: string[];
  years: number[];
  countries: Array<{ code: string; label: string }>;
  languages: Array<{ code: string; label: string }>;
  providers: Array<{ id: number; name: string }>;
};
