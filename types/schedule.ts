export type ScheduleKind = "episode" | "season-premiere" | "series-premiere";

export type ScheduleView =
  | "trending"
  | "upcoming"
  | "season-premieres"
  | "airing-soon"
  | "recently-aired"
  | "latest-premieres";

export type ScheduledEpisode = {
  id: string;
  showId: string;
  tmdbId?: string;
  title: string;
  slug: string;
  poster: string;
  seasonNumber: number;
  episodeNumber: number;
  airsAt: string;
  precision: "date" | "datetime";
  kind: ScheduleKind;
  rank?: number;
  rating?: number;
  sourceUrl: string;
};

export type ScheduleDashboard = {
  trending: ScheduledEpisode[];
  upcoming: ScheduledEpisode[];
  airingSoon: ScheduledEpisode[];
};

export type ShowSchedule = {
  showId: string;
  title: string;
  slug: string;
  poster: string;
  tmdbId?: string;
  rank?: number;
  rating?: number;
  next?: ScheduledEpisode;
  previous?: ScheduledEpisode;
  premiere?: ScheduledEpisode;
  episodes: ScheduledEpisode[];
};

