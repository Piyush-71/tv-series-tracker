import type { ScheduleDashboard, ScheduledEpisode, ScheduleView, ShowSchedule } from "@/types/schedule";

export type ScheduleSource = {
  list(): Promise<ScheduledEpisode[]>;
};

export type ScheduleService = {
  getDashboard(now?: Date, limit?: number): Promise<ScheduleDashboard>;
  getView(view: ScheduleView, now?: Date, limit?: number): Promise<ScheduledEpisode[]>;
  getFollowable(now?: Date, limit?: number): Promise<ScheduledEpisode[]>;
  getShow(showId: string, now?: Date): Promise<ShowSchedule | undefined>;
};

const day = 86_400_000;

export function createScheduleService(source: ScheduleSource): ScheduleService {
  async function getView(view: ScheduleView, now = new Date(), limit = 60) {
    const items = await source.list();
    const nowTime = now.getTime();
    const future = items.filter((item) => time(item) >= nowTime);
    const past = items.filter((item) => time(item) < nowTime);

    switch (view) {
      case "trending":
        return uniqueShows(
          future
            .filter((item) => item.rank && item.rank > 0 && item.seasonNumber < 100)
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || time(a) - time(b)),
        ).slice(0, limit);
      case "upcoming":
        return uniqueShows(future.filter((item) => item.kind === "series-premiere").sort(byAirtime)).slice(0, limit);
      case "season-premieres":
        return uniqueShows(future.filter((item) => item.kind !== "episode").sort(byAirtime)).slice(0, limit);
      case "airing-soon":
        return uniqueShows(future.sort(byAirtime)).slice(0, limit);
      case "recently-aired":
        return uniqueShows(past.filter((item) => time(item) >= nowTime - 7 * day).sort(byLatest)).slice(0, limit);
      case "latest-premieres":
        return uniqueShows(
          past.filter((item) => item.kind !== "episode" && time(item) >= nowTime - 30 * day).sort(byLatest),
        ).slice(0, limit);
    }
  }

  return {
    async getDashboard(now = new Date(), limit = 8) {
      const [trending, upcoming, airingSoon] = await Promise.all([
        getView("trending", now, limit),
        getView("upcoming", now, limit),
        getView("airing-soon", now, limit),
      ]);
      return { trending, upcoming, airingSoon };
    },
    getView,
    async getFollowable(now = new Date(), limit = 1_000) {
      const items = await source.list();
      const nowTime = now.getTime();
      const future = items.filter((item) => time(item) >= nowTime).sort(byAirtime);
      const past = items.filter((item) => time(item) < nowTime).sort(byLatest);
      return uniqueShows([...future, ...past]).slice(0, limit);
    },
    async getShow(showId, now = new Date()) {
      const episodes = (await source.list()).filter((item) => item.showId === showId).sort(byAirtime);
      if (!episodes.length) return undefined;

      const nowTime = now.getTime();
      const representative = episodes.find((item) => time(item) >= nowTime) ?? episodes.at(-1)!;
      const premiere = episodes.find((item) => item.kind === "series-premiere");

      return {
        showId,
        title: representative.title,
        slug: representative.slug,
        poster: representative.poster,
        tmdbId: representative.tmdbId,
        rank: representative.rank,
        rating: representative.rating,
        next: episodes.find((item) => time(item) >= nowTime),
        previous: episodes.filter((item) => time(item) < nowTime).at(-1),
        premiere,
        episodes,
      };
    },
  };
}

function uniqueShows(items: ScheduledEpisode[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.showId)) return false;
    seen.add(item.showId);
    return true;
  });
}

function time(item: ScheduledEpisode) {
  return new Date(item.airsAt).getTime();
}

function byAirtime(a: ScheduledEpisode, b: ScheduledEpisode) {
  return time(a) - time(b);
}

function byLatest(a: ScheduledEpisode, b: ScheduledEpisode) {
  return time(b) - time(a);
}
