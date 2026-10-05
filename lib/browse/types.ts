import type { MediaTitle } from "@/types/media";

export type BrowseMode = "tv" | "anime" | "movie";
export type PremiereFilter = "new" | "returning" | "airing";
export type DateRange = "7" | "30" | "90" | "upcoming" | "custom" | "all";
export type BrowseSort = "newest" | "oldest" | "next_episode" | "rating" | "popularity" | "title";

export type BrowseQuery = {
  mode: BrowseMode;
  premiere: PremiereFilter;
  countries: string[];
  genres: string[];
  query: string;
  range: DateRange;
  from: string;
  to: string;
  minRating: number | null;
  sort: BrowseSort;
  timeZone: string;
  page: number;
  snapshot?: string;
};

export type BrowseSeason = { number: number; premiereDate: string };
export type BrowseRecord = {
  title: MediaTitle;
  releaseDate: string | null;
  seasons: BrowseSeason[];
  // A confirmed future episode is positive evidence of an unfinished season.
  nextEpisode: { season: number; date: string } | null;
  rating: number | null;
  popularity: number | null;
};

export type BrowseResult = {
  title: MediaTitle;
  date: string;
  season: number | null;
  nextEpisodeDate: string | null;
  rating: number | null;
  popularity: number | null;
};

export type BrowseInventory = {
  records: BrowseRecord[];
  snapshot: string;
  updatedAt: string;
  candidateCount: number;
  failedCount: number;
};

export type BrowsePage = {
  results: BrowseResult[];
  totalResults: number;
  totalPages: number;
  page: number;
  hasMore: boolean;
  coverage: {
    verifiedTitles: number;
    candidateTitles: number;
    unavailableTitles: number;
    updatedAt: string | null;
    configured: boolean;
  };
  snapshot: string;
};

export type BrowseOptions = {
  countries: Array<{ code: string; label: string }>;
  genres: string[];
};
