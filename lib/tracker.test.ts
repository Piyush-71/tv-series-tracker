import { describe, expect, it } from "vitest";
import {
  createTrackerData,
  getTitleProgress,
  importTrackerData,
  markRecentlyViewed,
  toggleEpisodeWatched,
} from "@/lib/tracker";

describe("personal tracker", () => {
  it("tracks episode progress through the public tracker data interface", () => {
    const initial = createTrackerData();
    const oneWatched = toggleEpisodeWatched(initial, "tv-42", "s1e1");
    const twoWatched = toggleEpisodeWatched(oneWatched, "tv-42", "s1e2");

    expect(getTitleProgress(twoWatched, "tv-42", 8)).toEqual({
      watched: 2,
      total: 8,
      percent: 25,
    });

    expect(getTitleProgress(toggleEpisodeWatched(twoWatched, "tv-42", "s1e1"), "tv-42", 8)).toEqual({
      watched: 1,
      total: 8,
      percent: 13,
    });
  });

  it("keeps recently viewed titles unique and newest first", () => {
    const initial = createTrackerData();
    const firstPass = markRecentlyViewed(initial, "movie-7", "2026-08-20T10:00:00.000Z");
    const secondTitle = markRecentlyViewed(firstPass, "tv-9", "2026-08-21T10:00:00.000Z");
    const revisited = markRecentlyViewed(secondTitle, "movie-7", "2026-08-22T10:00:00.000Z");

    expect(revisited.recentlyViewed).toEqual([
      { id: "movie-7", viewedAt: "2026-08-22T10:00:00.000Z" },
      { id: "tv-9", viewedAt: "2026-08-21T10:00:00.000Z" },
    ]);
  });

  it("imports valid portable data and rejects malformed files", () => {
    const imported = importTrackerData(
      JSON.stringify({
        version: 1,
        watchlistIds: ["movie-7"],
        watchedTitleIds: [],
        episodeProgress: {},
        recentlyViewed: [],
        ratings: { "movie-7": 4 },
        notes: {},
        releaseOverrides: {},
        reminders: {},
        searchHistory: ["Dune"],
        preferences: {
          theme: "dark",
          favoriteGenres: ["Science Fiction"],
          services: ["Netflix"],
          timeZone: "Asia/Kolkata",
          browserNotifications: false,
        },
      }),
    );

    expect(imported.watchlistIds).toEqual(["movie-7"]);
    expect(imported.ratings["movie-7"]).toBe(4);
    expect(() => importTrackerData('{"version":1,"watchlistIds":"nope"}')).toThrow(
      "Invalid Cinecount tracker file",
    );
  });
});
