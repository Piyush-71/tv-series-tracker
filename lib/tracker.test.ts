import { describe, expect, it } from "vitest";
import {
  createTrackerData,
  getTitleProgress,
  importTrackerData,
  markRecentlyViewed,
  toggleEpisodeWatched,
} from "@/lib/tracker";

describe("personal tracker", () => {
  it("recovers invalid saved timezones without losing tracker data", () => {
    const saved = createTrackerData();
    saved.watchlistIds = ["tv-42"];
    saved.preferences.timeZone = "Invalid/Timezone";
    const imported = importTrackerData(JSON.stringify(saved));
    expect(imported.preferences.timeZone).toBe("UTC");
    expect(imported.watchlistIds).toEqual(["tv-42"]);
  });

  it("tracks episode progress through the public tracker data interface", () => {
    const initial = createTrackerData();
    const oneWatched = toggleEpisodeWatched(initial, "tv-42", "s1e1");
    const twoWatched = toggleEpisodeWatched(oneWatched, "tv-42", "s1e2");

    expect(getTitleProgress(twoWatched, "tv-42", 8)).toEqual({
      watched: 2,
      total: 8,
      percent: 25,
    });

    expect(
      getTitleProgress(
        toggleEpisodeWatched(twoWatched, "tv-42", "s1e1"),
        "tv-42",
        8,
      ),
    ).toEqual({
      watched: 1,
      total: 8,
      percent: 13,
    });
  });

  it("keeps recently viewed titles unique and newest first", () => {
    const initial = createTrackerData();
    const firstPass = markRecentlyViewed(
      initial,
      "movie-7",
      "2026-08-20T10:00:00.000Z",
    );
    const secondTitle = markRecentlyViewed(
      firstPass,
      "tv-9",
      "2026-08-21T10:00:00.000Z",
    );
    const revisited = markRecentlyViewed(
      secondTitle,
      "movie-7",
      "2026-08-22T10:00:00.000Z",
    );

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
    expect(() =>
      importTrackerData('{"version":1,"watchlistIds":"nope"}'),
    ).toThrow("Invalid Cinecount tracker file");
  });
});

describe("tracker import safety", () => {
  it.each([
    "not-a-date",
    "2026-02-30",
    "2026-13-01",
    "2026-10-20T25:00:00Z",
    "2026-02-30T10:00:00Z",
  ])("rejects unsafe override %s before it can reach a formatter", (date) => {
    const saved = createTrackerData();
    saved.releaseOverrides["tv-42"] = date;
    expect(() => importTrackerData(JSON.stringify(saved))).toThrow(
      "Invalid Cinecount tracker file",
    );
  });
  it.each([0, 6, -1])("rejects out-of-range rating %s", (rating) => {
    const saved = createTrackerData();
    saved.ratings["tv-42"] = rating;
    expect(() => importTrackerData(JSON.stringify(saved))).toThrow();
  });
  it.each([["s1e1", "s1e1"], ["garbage"], ["s-1e2"], ["s1e0"]])(
    "rejects malformed or duplicate episode keys %j",
    (...keys) => {
      const saved = createTrackerData();
      saved.episodeProgress["tv-42"] = keys;
      expect(() => importTrackerData(JSON.stringify(saved))).toThrow();
    },
  );
  it.each([
    { releaseDate: "2026-02-30" },
    { createdAt: "yesterday" },
    { leadMinutes: -1 },
    { leadMinutes: 0.5 },
    { id: "another-title" },
    { status: "unknown" },
  ])("rejects unsafe reminders %j", (patch) => {
    const saved = createTrackerData();
    saved.reminders["tv-42"] = {
      id: "tv-42",
      title: "Example",
      releaseDate: "2099-03-04",
      leadMinutes: 1440,
      createdAt: "2026-10-20T10:00:00Z",
      status: "scheduled",
      ...patch,
    } as (typeof saved.reminders)[string];
    expect(() => importTrackerData(JSON.stringify(saved))).toThrow();
  });
});

it("preserves valid v1 exports including date-only reminders and special-season progress", () => {
  const saved = createTrackerData();
  saved.episodeProgress["tv-42"] = ["s0e1", "s1e2"];
  saved.releaseOverrides["tv-42"] = "2099-03-04";
  saved.reminders["tv-42"] = {
    id: "tv-42",
    title: "Example",
    releaseDate: "2099-03-04",
    leadMinutes: 1440,
    createdAt: "2026-10-20T10:00:00.000Z",
    status: "scheduled",
  };
  expect(importTrackerData(JSON.stringify(saved))).toEqual(saved);
});

it("rejects invalid recently-viewed calendar timestamps", () => {
  const saved = createTrackerData();
  saved.recentlyViewed = [{ id: "tv-42", viewedAt: "2026-02-30T10:00:00Z" }];
  expect(() => importTrackerData(JSON.stringify(saved))).toThrow(
    "Invalid Cinecount tracker file",
  );
});
