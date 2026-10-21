import { describe, expect, it } from "vitest";
import { browseQueryParams, defaultBrowseQuery, parseBrowseQuery } from "@/lib/browse/query";

describe("browse URLs", () => {
  it("defaults Upcoming to the soonest premiere while honoring an explicit sort", () => {
    expect(parseBrowseQuery(new URLSearchParams("range=upcoming")).sort).toBe("oldest");
    expect(parseBrowseQuery(new URLSearchParams("range=upcoming&sort=rating")).sort).toBe("rating");
  });
  it("starts with the agreed defaults and chosen timezone", () => {
    expect(parseBrowseQuery(new URLSearchParams(), "Asia/Kolkata")).toMatchObject({ mode: "tv", premiere: "new", range: "30", sort: "newest", minRating: null, page: 1, timeZone: "Asia/Kolkata" });
  });
  it("round trips multiple countries, languages and genres, custom dates, sorting, and pagination", () => {
    const query = { ...defaultBrowseQuery(), countries: ["KR", "JP"], languages: ["ko", "ja"], genres: ["Drama", "Sci-Fi & Fantasy"], range: "custom" as const, from: "2026-09-01", to: "2026-10-03", minRating: 7.5, query: "Signal", page: 2, snapshot: "0123456789abcdef" };
    expect(parseBrowseQuery(browseQueryParams(query))).toEqual(query);
  });
  it("removes hidden controls in Movie and Currently Airing modes", () => {
    expect(parseBrowseQuery(new URLSearchParams("type=movie&premiere=airing&sort=next_episode"))).toMatchObject({ premiere: "new", sort: "newest", range: "30" });
    const airing = parseBrowseQuery(new URLSearchParams("premiere=airing&range=custom&from=invalid"));
    expect(airing.range).toBe("all");
    expect(browseQueryParams(airing).has("range")).toBe(false);
  });
  it.each(["range=custom&from=2026-02-30&to=2026-03-02", "range=custom&from=2026-10-03&to=2026-10-01", "minRating=-1", "minRating=11", "minRating=NaN", "page=0", "page=1.5", "country=USA", "type=event", "sort=invalid", "snapshot=invalid"])("rejects malformed input: %s", (input) => {
    expect(() => parseBrowseQuery(new URLSearchParams(input))).toThrow();
  });
  it("normalizes an invalid timezone and deduplicates selections", () => {
    expect(parseBrowseQuery(new URLSearchParams("tz=invalid&country=kr&country=KR&genre=Drama&genre=Drama"))).toMatchObject({ timeZone: "UTC", countries: ["KR"], genres: ["Drama"] });
  });
  it("normalizes repeated and comma-separated language codes", () => {
    expect(parseBrowseQuery(new URLSearchParams("language=EN,ko&language=en&language="))).toMatchObject({ languages: ["en", "ko"] });
    expect(browseQueryParams(defaultBrowseQuery()).has("language")).toBe(false);
  });
  it.each(["language=eng", "language=en-US", "language=12", `language=${Array.from({ length: 31 }, (_, index) => String.fromCharCode(97 + Math.floor(index / 26), 97 + index % 26)).join(",")}`])("rejects invalid language selections: %s", (input) => {
    expect(() => parseBrowseQuery(new URLSearchParams(input))).toThrow("Choose valid language codes");
  });
});
