import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowseSnapshotChanged, getBrowsePage } from "@/lib/browse/service";
import { defaultBrowseQuery } from "@/lib/browse/query";
import type { TmdbDetails } from "@/lib/tmdb/types";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), configured: vi.fn(), calendar: vi.fn() }));
vi.mock("@/lib/tmdb/client", () => ({ tmdbFetch: mocks.fetch, hasTmdbCredentials: mocks.configured }));
vi.mock("@/lib/schedule/simkl", () => ({ simklScheduleSource: { list: mocks.calendar } }));
vi.mock("next/cache", () => ({ unstable_cache: <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) => fn }));

const now = new Date("2026-10-03T12:00:00Z");
let movies: TmdbDetails[];

beforeEach(() => {
  vi.clearAllMocks();
  movies = Array.from({ length: 45 }, (_, index) => ({ id: index + 1, title: `Movie ${index + 1}`, release_date: "2026-10-01", origin_country: [index % 2 === 0 ? "KR" : "US"], genres: [{ id: 18, name: "Drama" }], vote_average: index / 5 + 1, vote_count: 100 }));
  mocks.configured.mockReturnValue(true);
  mocks.calendar.mockResolvedValue([]);
  mocks.fetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/genre/")) return { genres: [{ id: 18, name: "Drama" }] };
    if (path === "/discover/movie") return { results: movies.map((movie) => ({ id: movie.id })), page: 1, total_results: 45, total_pages: 3 };
    const match = path.match(/^\/movie\/(\d+)$/);
    if (match) return movies.find((movie) => movie.id === Number(match[1]));
    throw new Error(`Unexpected test path ${path}`);
  });
});

describe("verified browse inventory", () => {
  it("globally sorts before pagination and extends the same ordered prefix", async () => {
    const query = { ...defaultBrowseQuery("movie"), sort: "rating" as const };
    const first = await getBrowsePage(query, now);
    expect(first.totalResults).toBe(45);
    expect(first.results).toHaveLength(20);
    expect(first.results[0].title.id).toBe("movie-45");
    const second = await getBrowsePage({ ...query, page: 2, snapshot: first.snapshot }, now);
    expect(second.results).toHaveLength(40);
    expect(second.results.slice(0, 20)).toEqual(first.results);
    expect(second.hasMore).toBe(true);
  });
  it("filters title search, country, date, and rating before totals and pagination", async () => {
    const result = await getBrowsePage({ ...defaultBrowseQuery("movie"), countries: ["KR"], genres: ["Drama"], minRating: 8, query: "Movie 4" }, now);
    expect(result.totalResults).toBe(3);
    expect(result.results.map((item) => item.title.id)).toEqual(["movie-41", "movie-43", "movie-45"]);
  });
  it("rejects continuing a changed inventory or crossing the date-window boundary", async () => {
    const query = defaultBrowseQuery("movie");
    const first = await getBrowsePage(query, now);
    await expect(getBrowsePage({ ...query, page: 2, snapshot: first.snapshot }, new Date("2026-10-04T12:00:00Z"))).rejects.toBeInstanceOf(BrowseSnapshotChanged);
    movies[0].vote_average = 9;
    await expect(getBrowsePage({ ...query, page: 2, snapshot: first.snapshot }, now)).rejects.toBeInstanceOf(BrowseSnapshotChanged);
  });
  it("does not substitute sample data when credentials are absent", async () => {
    mocks.configured.mockReturnValue(false);
    expect(await getBrowsePage(defaultBrowseQuery(), now)).toMatchObject({ results: [], coverage: { configured: false, verifiedTitles: 0 } });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
