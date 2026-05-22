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
};

export type TmdbWatchProviders = {
  results?: Record<string, { flatrate?: TmdbProvider[]; buy?: TmdbProvider[]; rent?: TmdbProvider[] }>;
};

export type TmdbDetails = TmdbListItem & {
  genres?: TmdbGenre[];
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
  "watch/providers"?: TmdbWatchProviders;
  similar?: TmdbListResponse<TmdbListItem>;
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
};
