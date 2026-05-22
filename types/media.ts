export type MediaType = "tv" | "movie" | "anime" | "event";

export type Platform = string;

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
