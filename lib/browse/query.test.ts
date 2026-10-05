import { describe, expect, it } from "vitest";
import { browseQueryParams, defaultBrowseQuery, parseBrowseQuery } from "@/lib/browse/query";

describe("browse URLs", () => {
  it("starts with the agreed defaults and chosen timezone", () => {
    expect(parseBrowseQuery(new URLSearchParams(), "Asia/Kolkata")).toMatchObject({ mode: "tv", premiere: "new", range: "30", sort: "newest", minRating: null, page: 1, timeZone: "Asia/Kolkata" });
  });
  it("round trips multiple countries and genres, custom dates, sorting, and pagination", () => {
    const query = { ...defaultBrowseQuery(), countries: ["KR", "JP"], genres: ["Drama", "Sci-Fi & Fantasy"], range: "custom" as const, from: "2026-09-01", to: "2026-10-03", minRating: 7.5, query: "Signal", page: 2, snapshot: "0123456789abcdef" };
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
});
