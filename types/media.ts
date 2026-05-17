export type MediaType = "tv" | "movie" | "anime" | "event";

export type Platform =
  | "Netflix"
  | "Apple TV+"
  | "HBO Max"
  | "Prime Video"
  | "Crunchyroll"
  | "Hulu"
  | "Disney+"
  | "Peacock";

export type CastMember = {
  name: string;
  role: string;
  image: string;
};

export type MediaTitle = {
  id: string;
  slug: string;
  title: string;
  type: MediaType;
  description: string;
  releaseDate: string;
  genres: string[];
  poster: string;
  backdrop: string;
  trailerUrl: string;
  rating: number;
  platform: Platform;
  cast: CastMember[];
  popularity: number;
  featured?: boolean;
};
