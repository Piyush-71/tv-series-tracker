import type {
  ScheduleDashboard,
  ScheduledEpisode,
  ScheduleView,
  ShowSchedule,
} from "@/types/schedule";

export type ScheduleSource = {
  list(): Promise<ScheduledEpisode[]>;
};

export type ScheduleService = {
  getDashboard(now?: Date, limit?: number): Promise<ScheduleDashboard>;
  getView(
    view: ScheduleView,
    now?: Date,
    limit?: number,
  ): Promise<ScheduledEpisode[]>;
  getFollowable(now?: Date, limit?: number): Promise<ScheduledEpisode[]>;
  getShow(showId: string, now?: Date): Promise<ShowSchedule | undefined>;
  getShows(showIds: string[], now?: Date): Promise<ShowSchedule[]>;
  getTrackedShows(ids: string[], now?: Date): Promise<Array<{ id: string; show: ShowSchedule }>>;
};

const day = 86_400_000;

export function createScheduleService(source: ScheduleSource): ScheduleService {
  async function getView(view: ScheduleView, now = new Date(), limit = 60) {
    return selectView(await source.list(), view, now, limit);
  }

  function selectView(
    items: ScheduledEpisode[],
    view: ScheduleView,
    now: Date,
    limit: number,
  ) {
    const nowTime = now.getTime();
    const future = items.filter((item) => time(item) >= nowTime);
    const past = items.filter((item) => time(item) < nowTime);

    switch (view) {
      case "trending":
        return uniqueShows(
          future
            .filter(
              (item) => item.rank && item.rank > 0 && item.seasonNumber < 100,
            )
            .sort(
              (a, b) =>
                (a.rank ?? Number.MAX_SAFE_INTEGER) -
                  (b.rank ?? Number.MAX_SAFE_INTEGER) || time(a) - time(b),
            ),
        ).slice(0, limit);
      case "upcoming":
        return uniqueShows(
          future
            .filter((item) => item.kind === "series-premiere")
            .sort(byAirtime),
        ).slice(0, limit);
      case "season-premieres":
        return uniqueShows(
          future.filter((item) => item.kind !== "episode").sort(byAirtime),
        ).slice(0, limit);
      case "airing-soon":
        return uniqueShows(future.sort(byAirtime)).slice(0, limit);
      case "recently-aired":
        return uniqueShows(
          past.filter((item) => time(item) >= nowTime - 7 * day).sort(byLatest),
        ).slice(0, limit);
      case "latest-premieres":
        return uniqueShows(
          past
            .filter(
              (item) =>
                item.kind !== "episode" && time(item) >= nowTime - 30 * day,
            )
            .sort(byLatest),
        ).slice(0, limit);
    }
  }

  return {
    async getDashboard(now = new Date(), limit = 8) {
      let items: ScheduledEpisode[];
      try {
        items = await source.list();
      } catch {
        return {
          trending: [],
          upcoming: [],
          airingSoon: [],
          unavailable: true as const,
        };
      }
      const trending = selectView(items, "trending", now, limit);
      const upcoming = selectView(items, "upcoming", now, limit);
      const airingSoon = selectView(items, "airing-soon", now, limit);
      return { trending, upcoming, airingSoon };
    },
    getView,
    async getFollowable(now = new Date(), limit = 1_000) {
      const items = await source.list();
      const nowTime = now.getTime();
      const future = items
        .filter((item) => time(item) >= nowTime)
        .sort(byAirtime);
      const past = items.filter((item) => time(item) < nowTime).sort(byLatest);
      return uniqueShows([...future, ...past]).slice(0, limit);
    },
    async getShow(showId, now = new Date()) {
      return toShowSchedule(showId, await source.list(), now);
    },
    async getShows(showIds, now = new Date()) {
      if (!showIds.length) return [];
      // One source read for the whole collection, regardless of dashboard limits.
      const wanted = new Set(showIds);
      const groups = new Map<string, ScheduledEpisode[]>();
      for (const item of await source.list()) {
        if (!wanted.has(item.showId)) continue;
        const episodes = groups.get(item.showId) ?? [];
        episodes.push(item);
        groups.set(item.showId, episodes);
      }
      return [...wanted].flatMap((id) => {
        const show = toShowSchedule(id, groups.get(id) ?? [], now);
        return show ? [show] : [];
      });
    },
    async getTrackedShows(ids, now = new Date()) {
      if (!ids.length) return [];
      const wanted = new Set(ids);
      const groups = new Map<string, ScheduledEpisode[]>();
      for (const item of await source.list()) {
        if (!wanted.has(`simkl-${item.showId}`) && !wanted.has(`tv-${item.tmdbId}`)) continue;
        const group = groups.get(item.showId) ?? [];
        group.push(item);
        groups.set(item.showId, group);
      }
      const shows = [...groups].flatMap(([id, episodes]) => {
        const show = toShowSchedule(id, episodes, now);
        return show ? [show] : [];
      }).sort((a, b) => {
        if (a.next && b.next) return a.next.airsAt.localeCompare(b.next.airsAt);
        if (a.next) return -1;
        if (b.next) return 1;
        return (b.previous?.airsAt ?? "").localeCompare(a.previous?.airsAt ?? "");
      });
      return [...wanted].flatMap((id) => {
        const show = shows.find((show) => id === `simkl-${show.showId}` || id === `tv-${show.tmdbId}`);
        return show ? [{ id, show }] : [];
      });
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

function toShowSchedule(
  showId: string,
  items: ScheduledEpisode[],
  now: Date,
): ShowSchedule | undefined {
  const episodes = items
    .filter((item) => item.showId === showId)
    .sort(byAirtime);
  if (!episodes.length) return undefined;
  const nowTime = now.getTime();
  const representative =
    episodes.find((item) => time(item) >= nowTime) ?? episodes.at(-1)!;
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
    premiere: episodes.find((item) => item.kind === "series-premiere"),
    episodes,
  };
}
