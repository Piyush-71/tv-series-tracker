import { describe, expect, it } from "vitest";
import { calendarDay, filterBrowseRecords } from "@/lib/browse/filter";
import { defaultBrowseQuery } from "@/lib/browse/query";
import { toBrowseRecord } from "@/lib/browse/mapper";
import type { TmdbDetails } from "@/lib/tmdb/types";
import type { BrowseQuery, BrowseRecord } from "@/lib/browse/types";

const now = new Date("2026-10-03T18:00:00Z");
const details: TmdbDetails = { id: 1, name: "Signal House", first_air_date: "2021-01-01", genres: [{ id: 18, name: "Drama" }], origin_country: ["KR"], vote_average: 8.4, vote_count: 200, popularity: 80, seasons: [{ season_number: 1, air_date: "2021-01-01" }, { season_number: 2, air_date: "2026-09-10" }, { season_number: 3, air_date: "2026-10-02" }] };
function record(overrides: Partial<TmdbDetails> = {}): BrowseRecord { return toBrowseRecord({ ...details, ...overrides }, new Map(), "tv"); }
function query(overrides: Partial<BrowseQuery> = {}): BrowseQuery { return { ...defaultBrowseQuery(), premiere: "returning", ...overrides }; }

describe("browse season selection", () => {
  it("uses the most recent matching returning season, not the series first-air date", () => {
    expect(filterBrowseRecords([record()], query(), now)).toMatchObject([{ season: 3, date: "2026-10-02" }]);
    expect(filterBrowseRecords([record()], query({ premiere: "new" }), now)).toEqual([]);
  });
  it("selects an older matching season when the newer season is outside the custom range", () => {
    expect(filterBrowseRecords([record()], query({ range: "custom", from: "2026-09-01", to: "2026-09-30" }), now)).toMatchObject([{ season: 2 }]);
  });
  it("combines OR country/genre selections with AND between filters and title search", () => {
    const records = [record(), record({ id: 2, name: "Other", origin_country: ["US"] })];
    expect(filterBrowseRecords(records, query({ countries: ["JP", "KR"], genres: ["Crime", "Drama"], query: "SIGNAL", minRating: 8 }), now).map((item) => item.title.id)).toEqual(["tv-1"]);
    expect(filterBrowseRecords(records, query({ countries: ["KR"], genres: ["Comedy"] }), now)).toEqual([]);
  });
  it("includes a season on a break with a confirmed future episode, excludes unknown/completed and not-yet-started seasons", () => {
    const next = { id: 30, name: "After the break", season_number: 3, episode_number: 5, air_date: "2026-11-15" };
    const onBreak = record({ next_episode_to_air: next });
    const notStarted = record({ id: 2, seasons: [{ season_number: 3, air_date: "2026-11-01" }], next_episode_to_air: next });
    expect(filterBrowseRecords([onBreak, record({ id: 3 }), notStarted], query({ premiere: "airing", range: "7" }), now).map((item) => item.title.id)).toEqual(["tv-1"]);
    expect(filterBrowseRecords([record({ next_episode_to_air: { ...next, season_number: 4 } })], query({ premiere: "airing" }), now)).toEqual([]);
  });
  it("keeps Anime exclusive to Japanese animated series and animated films under Movies", () => {
    const anime = record({ id: 2, origin_country: ["JP"], genres: [{ id: 16, name: "Animation" }] });
    const animation = record({ id: 3, origin_country: ["US"], genres: [{ id: 16, name: "Animation" }] });
    const movie = toBrowseRecord({ id: 4, title: "Animated film", release_date: "2026-10-01", origin_country: ["JP"], genres: [{ id: 16, name: "Animation" }] }, new Map(), "movie");
    expect(filterBrowseRecords([anime, animation, movie], query({ mode: "anime" }), now).map((item) => item.title.id)).toEqual(["tv-2"]);
    expect(filterBrowseRecords([anime, animation, movie], query(), now).map((item) => item.title.id)).toEqual(["tv-3"]);
    expect(filterBrowseRecords([anime, movie], query({ mode: "movie" }), now).map((item) => item.title.id)).toEqual(["movie-4"]);
  });
});

describe("browse dates and unknown values", () => {
  it("counts inclusive calendar days and excludes tomorrow from recent presets", () => {
    const records = ["2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04"].map((date, index) => record({ id: index, first_air_date: date, seasons: [] }));
    expect(filterBrowseRecords(records, query({ premiere: "new", range: "7" }), now).map((item) => item.date)).toEqual(["2026-10-03", "2026-09-27"]);
    expect(filterBrowseRecords(records, query({ premiere: "new", range: "upcoming" }), now).map((item) => item.date)).toEqual(["2026-10-04"]);
    expect(filterBrowseRecords(records, query({ premiere: "new", range: "custom", from: "2026-09-27", to: "2026-10-03" }), now)).toHaveLength(2);
  });
  it("uses the selected timezone for today and never shifts a date-only premiere", () => {
    const midnight = new Date("2026-10-03T01:00:00Z");
    expect(calendarDay(midnight, "America/Los_Angeles")).toBe("2026-10-02");
    expect(calendarDay("2026-10-03", "America/Los_Angeles")).toBe("2026-10-03");
    expect(filterBrowseRecords([record({ first_air_date: "2026-10-03", seasons: [] })], query({ premiere: "new", timeZone: "America/Los_Angeles" }), midnight)).toEqual([]);
  });
  it("does not invent release dates or ratings and excludes unrated titles for an active rating filter", () => {
    const unknown = toBrowseRecord({ id: 3, title: "Unknown", vote_average: 0, vote_count: 0 }, new Map(), "movie");
    expect(unknown.releaseDate).toBeNull();
    expect(unknown.rating).toBeNull();
    expect(filterBrowseRecords([unknown], query({ mode: "movie", range: "all" }), now)).toEqual([]);
    expect(filterBrowseRecords([record({ vote_count: 0 })], query({ minRating: 0 }), now)).toEqual([]);
  });
  it("sorts missing values last and breaks ties consistently", () => {
    const records = [record({ id: 1, name: "B", vote_count: 0, popularity: undefined }), record({ id: 2, name: "A", vote_average: 7, popularity: 20 }), record({ id: 3, name: "C", vote_average: 9, popularity: 40 })];
    expect(filterBrowseRecords(records, query({ sort: "rating" }), now).map((item) => item.title.id)).toEqual(["tv-3", "tv-2", "tv-1"]);
    expect(filterBrowseRecords(records, query({ sort: "popularity" }), now).map((item) => item.title.id)).toEqual(["tv-3", "tv-2", "tv-1"]);
    expect(filterBrowseRecords(records, query({ sort: "title" }), now).map((item) => item.title.id)).toEqual(["tv-2", "tv-1", "tv-3"]);
  });
  it("sorts unknown next episodes last", () => {
    const upcoming = record({ id: 2, next_episode_to_air: { id: 1, name: "Next", season_number: 3, episode_number: 2, air_date: "2026-10-08" } });
    expect(filterBrowseRecords([record(), upcoming], query({ sort: "next_episode" }), now).map((item) => item.title.id)).toEqual(["tv-2", "tv-1"]);
  });
});
