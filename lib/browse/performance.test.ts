import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBrowseOptions, getBrowsePage } from "@/lib/browse/service";
import { defaultBrowseQuery } from "@/lib/browse/query";
import type { TmdbListItem } from "@/lib/tmdb/types";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), resetCaches: new Set<() => void>() }));
vi.mock("@/lib/tmdb/client", () => ({ tmdbFetch: mocks.fetch, hasTmdbCredentials: () => true }));
vi.mock("next/cache", async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  const scope = new AsyncLocalStorage<boolean>();
  return {
    unstable_cache: <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) => {
      const cache = new Map<string, Promise<Result>>();
      mocks.resetCaches.add(() => cache.clear());
      return (...args: Args) => {
        // Match installed Next.js: nested unstable_cache calls bypass existing entries.
        if (scope.getStore()) return fn(...args);
        const key = JSON.stringify(args);
        const pending = cache.get(key);
        if (pending) return pending;
        const result = scope.run(true, fn, ...args).catch((error) => { cache.delete(key); throw error; });
        cache.set(key, result);
        return result;
      };
    },
  };
});

const now = new Date("2026-10-03T12:00:00Z");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetCaches.forEach((reset) => reset());
});

function source(type: "movie" | "tv", count = 200) {
  const titles: TmdbListItem[] = Array.from({ length: count }, (_, index) => ({
    id: index + 1, title: `Title ${index + 1}`, name: `Title ${index + 1}`,
    release_date: "2026-10-01", first_air_date: "2026-10-01", genre_ids: [18],
    original_language: "hi", origin_country: ["IN"], vote_average: 8, vote_count: 10,
  }));
  mocks.fetch.mockImplementation(async (path: string, options?: { params?: { page?: number } }) => {
    if (path.startsWith("/genre/")) return { genres: [{ id: 18, name: "Drama" }] };
    if (path.startsWith("/configuration/")) return [];
    if (path === `/discover/${type}` || path === `/search/${type}`) {
      const page = options?.params?.page || 1;
      return { results: titles.slice((page - 1) * 20, page * 20), total_pages: Math.ceil(count / 20), total_results: count };
    }
    const id = Number(path.split("/").pop());
    return { ...titles[id - 1], genres: [{ id: 18, name: "Drama" }] };
  });
  return titles;
}

describe("Explore upstream request budget", () => {
  it.each(["movie", "tv"] as const)("does not hydrate every candidate for ordinary %s premieres", async (type) => {
    source(type);
    const result = await getBrowsePage(defaultBrowseQuery(type), now);
    expect(result.totalResults).toBe(200);
    expect(result.results).toHaveLength(20);
    // Ten source pages + two genre lists + details for only the 20 visible cards.
    expect(mocks.fetch.mock.calls.length).toBeLessThanOrEqual(32);
  });
  it("reuses visible-card metadata on pagination and across sort/filter inventories", async () => {
    source("movie");
    const query = defaultBrowseQuery("movie");
    const first = await getBrowsePage(query, now);
    const second = await getBrowsePage({ ...query, page: 2, snapshot: first.snapshot }, now);
    expect(second.results.slice(0, 20)).toEqual(first.results);
    expect(mocks.fetch.mock.calls.filter(([path]) => /^\/movie\/\d+$/.test(path))).toHaveLength(40);
    expect(mocks.fetch.mock.calls.filter(([path]) => path.startsWith("/genre/"))).toHaveLength(2);
    await getBrowsePage({ ...query, sort: "title" }, now);
    expect(mocks.fetch.mock.calls.filter(([path]) => /^\/movie\/\d+$/.test(path))).toHaveLength(40);
    expect(mocks.fetch.mock.calls.filter(([path]) => path.startsWith("/genre/"))).toHaveLength(2);
  });
  it("returns the first page before optional card details are requested", async () => {
    source("movie");
    const query = defaultBrowseQuery("movie");
    const first = await getBrowsePage(query, now, false);
    expect(first.totalResults).toBe(200);
    expect(first.results).toHaveLength(20);
    expect(first.detailsPending).toBe(true);
    expect(mocks.fetch.mock.calls).toHaveLength(12);
    const enriched = await getBrowsePage({ ...query, snapshot: first.snapshot }, now);
    expect(enriched.results.map((item) => item.title.id)).toEqual(first.results.map((item) => item.title.id));
    expect(enriched.totalResults).toBe(first.totalResults);
    expect(enriched.detailsPending).toBe(false);
    expect(mocks.fetch.mock.calls).toHaveLength(32);
  });
  it("shares cached genre lists between the options page and browse requests", async () => {
    source("movie");
    expect((await getBrowseOptions()).genres).toEqual(["Drama"]);
    await getBrowsePage(defaultBrowseQuery("movie"), now, false);
    expect(mocks.fetch.mock.calls.filter(([path]) => path.startsWith("/genre/"))).toHaveLength(2);
  });
  it("retains upstream country-filtered movie matches when summaries omit origin countries", async () => {
    const titles = source("movie", 2);
    titles.forEach((title) => { title.origin_country = undefined; });
    const first = await getBrowsePage({ ...defaultBrowseQuery("movie"), countries: ["IN"] }, now, false);
    expect(first.totalResults).toBe(2);
    expect(first.results).toHaveLength(2);
    expect(mocks.fetch.mock.calls.filter(([path]) => /^\/movie\/\d+$/.test(path))).toHaveLength(0);
    const discovery = mocks.fetch.mock.calls.find(([path]) => path === "/discover/movie");
    expect(discovery?.[1].params.with_origin_country).toBe("IN");
  });
  it("fetches independent discovery pages concurrently with a limit of four", async () => {
    source("movie");
    const fetch = mocks.fetch.getMockImplementation()!;
    let active = 0;
    let peak = 0;
    mocks.fetch.mockImplementation(async (path, options) => {
      if (path === "/discover/movie" && options.params.page > 1) {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
      }
      return fetch(path, options);
    });
    await getBrowsePage(defaultBrowseQuery("movie"), now);
    expect(peak).toBe(4);
  });
  it("still verifies every candidate when returning-season dates affect eligibility", async () => {
    source("tv");
    const fetch = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (path, options) => {
      const result = await fetch(path, options);
      if (/^\/tv\/\d+$/.test(path)) return { ...result, seasons: [{ season_number: 2, air_date: result.id === 1 ? "2026-10-01" : "2020-01-01" }] };
      return result;
    });
    expect((await getBrowsePage({ ...defaultBrowseQuery(), premiere: "returning" }, now)).results).toMatchObject([{ title: { id: "tv-1" }, season: 2 }]);
    expect(mocks.fetch.mock.calls.filter(([path]) => /^\/tv\/\d+$/.test(path))).toHaveLength(200);
    await getBrowsePage({ ...defaultBrowseQuery(), premiere: "returning", sort: "title" }, now);
    expect(mocks.fetch.mock.calls.filter(([path]) => /^\/tv\/\d+$/.test(path))).toHaveLength(200);
  });
  it("verifies country filters on movie search results before computing totals", async () => {
    const titles = source("movie", 2);
    titles.forEach((title) => { title.origin_country = undefined; });
    const fetch = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (path, options) => {
      const result = await fetch(path, options);
      if (/^\/movie\/\d+$/.test(path)) return { ...result, production_countries: [{ iso_3166_1: result.id === 1 ? "US" : "IN", name: "Country" }] };
      return result;
    });
    const page = await getBrowsePage({ ...defaultBrowseQuery("movie"), query: "Original name", countries: ["IN"] }, now);
    expect(page.totalResults).toBe(1);
    expect(page.results).toMatchObject([{ title: { id: "movie-2", originCountries: ["IN"] } }]);
  });
  it("keeps a valid summary match when optional visible-card detail fetching fails", async () => {
    source("movie", 1);
    const fetch = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (path, options) => {
      if (path === "/movie/1") throw new Error("Details unavailable");
      return fetch(path, options);
    });
    const page = await getBrowsePage(defaultBrowseQuery("movie"), now);
    expect(page.totalResults).toBe(1);
    expect(page.results).toHaveLength(1);
    expect(page.coverage.unavailableTitles).toBe(1);
  });
});
