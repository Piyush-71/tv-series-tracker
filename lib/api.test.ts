import { describe, expect, it } from "vitest";
import { ApiInputError, createRateLimiter, parseTitleQuery } from "@/lib/api";

describe("title API input", () => {
  it("accepts and normalizes supported discovery filters", () => {
    expect(
      parseTitleQuery(new URLSearchParams("type=anime&page=3&year=2027&sort=release_date&country=JP&language=ja&provider=8&availability=flatrate")),
    ).toEqual({
      type: "anime",
      page: 3,
      year: 2027,
      sort: "release_date",
      country: "JP",
      language: "ja",
      provider: 8,
      availability: "flatrate",
    });
  });

  it("rejects unsupported values with a caller-safe input error", () => {
    expect(() => parseTitleQuery(new URLSearchParams("page=-1"))).toThrow(ApiInputError);
    expect(() => parseTitleQuery(new URLSearchParams("sort=secret"))).toThrow("Unsupported sort value");
  });
});

describe("API rate limiting", () => {
  it("allows a fixed number of requests in a window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
    expect(limiter.check("viewer", 10_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.check("viewer", 10_100)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.check("viewer", 10_200)).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 1 });
    expect(limiter.check("viewer", 11_001)).toMatchObject({ allowed: true, remaining: 1 });
  });
});
