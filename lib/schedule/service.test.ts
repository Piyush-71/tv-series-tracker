import { describe, expect, it } from "vitest";
import { createScheduleService, type ScheduleSource } from "@/lib/schedule/service";
import type { ScheduledEpisode } from "@/types/schedule";

const now = new Date("2026-10-03T12:00:00.000Z");

function episode(overrides: Partial<ScheduledEpisode> & Pick<ScheduledEpisode, "id" | "showId" | "title" | "airsAt">): ScheduledEpisode {
  return {
    slug: overrides.title.toLowerCase().replaceAll(" ", "-"),
    poster: "https://example.com/poster.jpg",
    seasonNumber: 2,
    episodeNumber: 3,
    precision: "datetime",
    kind: "episode",
    sourceUrl: "https://example.com/show",
    ...overrides,
  };
}

function source(items: ScheduledEpisode[]): ScheduleSource {
  return { list: async () => items };
}

describe("schedule module", () => {
  it("builds distinct dashboard lanes from scheduled episodes", async () => {
    const items = [
      episode({ id: "popular-next", showId: "popular", title: "Popular", airsAt: "2026-10-04T12:00:00.000Z", rank: 2 }),
      episode({ id: "popular-later", showId: "popular", title: "Popular", airsAt: "2026-10-11T12:00:00.000Z", rank: 2 }),
      episode({ id: "premiere", showId: "new", title: "New Show", airsAt: "2026-10-03T15:00:00.000Z", seasonNumber: 1, episodeNumber: 1, kind: "series-premiere" }),
      episode({ id: "soon", showId: "soon", title: "Soon", airsAt: "2026-10-03T13:00:00.000Z", rank: 50 }),
      episode({ id: "past", showId: "past", title: "Past", airsAt: "2026-10-03T09:00:00.000Z", rank: 1 }),
    ];

    const schedule = createScheduleService(source(items));
    const dashboard = await schedule.getDashboard(now, 10);

    expect(dashboard.trending.map((item) => item.id)).toEqual(["popular-next", "soon"]);
    expect(dashboard.upcoming.map((item) => item.id)).toEqual(["premiere"]);
    expect(dashboard.airingSoon.map((item) => item.id)).toEqual(["soon", "premiere", "popular-next"]);
  });

  it("returns the next, previous, and original premiere for a show", async () => {
    const items = [
      episode({ id: "premiere", showId: "show", title: "Show", airsAt: "2026-09-01T12:00:00.000Z", seasonNumber: 1, episodeNumber: 1, kind: "series-premiere" }),
      episode({ id: "previous", showId: "show", title: "Show", airsAt: "2026-10-02T12:00:00.000Z" }),
      episode({ id: "next", showId: "show", title: "Show", airsAt: "2026-10-04T12:00:00.000Z" }),
      episode({ id: "later", showId: "show", title: "Show", airsAt: "2026-10-11T12:00:00.000Z" }),
    ];

    const schedule = createScheduleService(source(items));
    const show = await schedule.getShow("show", now);

    expect(show?.next?.id).toBe("next");
    expect(show?.previous?.id).toBe("previous");
    expect(show?.premiere?.id).toBe("premiere");
    expect(show?.episodes.map((item) => item.id)).toEqual(["premiere", "previous", "next", "later"]);
  });

  it("classifies each public schedule view at the module interface", async () => {
    const items = [
      episode({ id: "series", showId: "series", title: "Series", airsAt: "2026-10-05T12:00:00.000Z", seasonNumber: 1, episodeNumber: 1, kind: "series-premiere" }),
      episode({ id: "season", showId: "season", title: "Season", airsAt: "2026-10-06T12:00:00.000Z", seasonNumber: 3, episodeNumber: 1, kind: "season-premiere" }),
      episode({ id: "recent", showId: "recent", title: "Recent", airsAt: "2026-10-03T10:00:00.000Z" }),
      episode({ id: "old-premiere", showId: "old", title: "Old", airsAt: "2026-10-02T10:00:00.000Z", seasonNumber: 2, episodeNumber: 1, kind: "season-premiere" }),
    ];

    const schedule = createScheduleService(source(items));

    await expect(schedule.getView("upcoming", now, 10)).resolves.toMatchObject([{ id: "series" }]);
    await expect(schedule.getView("season-premieres", now, 10)).resolves.toMatchObject([{ id: "series" }, { id: "season" }]);
    await expect(schedule.getView("recently-aired", now, 10)).resolves.toMatchObject([{ id: "recent" }, { id: "old-premiere" }]);
    await expect(schedule.getView("latest-premieres", now, 10)).resolves.toMatchObject([{ id: "old-premiere" }]);
  });

  it("keeps every followable show with its next or latest aired episode", async () => {
    const items = [
      episode({ id: "next", showId: "returning", title: "Returning", airsAt: "2026-10-04T12:00:00.000Z" }),
      episode({ id: "later", showId: "returning", title: "Returning", airsAt: "2026-10-11T12:00:00.000Z" }),
      episode({ id: "recent", showId: "aired", title: "Aired", airsAt: "2026-10-03T10:00:00.000Z" }),
    ];

    const schedule = createScheduleService(source(items));

    await expect(schedule.getFollowable(now)).resolves.toMatchObject([{ id: "next" }, { id: "recent" }]);
  });
});
