export type MediaType = "tv" | "movie" | "anime" | "event";

export type Platform = string;

export type CastMember = {
  name: string;
  role: string;
  image: string;
};

export type StreamingProvider = {
  id: number;
  name: string;
  logo?: string;
};

export type MediaEpisode = {
  id: string;
  name: string;
  overview: string;
  airDate?: string;
  episodeNumber: number;
  seasonNumber: number;
  runtime?: number;
  still?: string;
  rating: number;
};

export type ReleaseDateOption = {
  kind: "premiere" | "theatrical" | "digital" | "physical" | "television" | "streaming";
  date: string;
  region: string;
  note?: string;
};

export type MediaTitle = {
  id: string;
  slug: string;
  title: string;
  type: MediaType;
  description: string;
  releaseDate: string;
  releasePrecision?: "date" | "datetime";
  releaseDates?: ReleaseDateOption[];
  genres: string[];
  poster: string;
  backdrop: string;
  trailerUrl: string;
  rating: number;
  platform: Platform;
  cast: CastMember[];
  popularity: number;
  originalLanguage?: string;
  originCountries?: string[];
  status?: string;
  runtime?: number;
  certification?: string;
  creators?: string[];
  seasonCount?: number;
  episodeCount?: number;
  nextEpisode?: MediaEpisode;
  providers?: StreamingProvider[];
  providerLink?: string;
  homepage?: string;
  featured?: boolean;
};
