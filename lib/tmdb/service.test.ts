import { beforeEach, describe, expect, it, vi } from "vitest";
import { TmdbApiError, hasTmdbCredentials, tmdbFetch } from "@/lib/tmdb/client";
import { getCatalog, getTitleBySlug } from "@/lib/tmdb/service";
import { mediaTitles } from "@/data/media";

vi.mock("@/lib/tmdb/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/tmdb/client")>(),
  hasTmdbCredentials: vi.fn(),
  tmdbFetch: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(hasTmdbCredentials).mockReturnValue(true);
  vi.mocked(tmdbFetch).mockReset();
  vi.mocked(tmdbFetch).mockImplementation(async (path) => {
    if (path.startsWith("/genre/")) return { genres: [] };
    if (path === "/tv/42") return { id: 42, name: "Outside the catalog", first_air_date: "" };
    throw new Error(`Unexpected request ${path}`);
  });
});

describe("title lookup failure classification", () => {
  it.each([429, 500, 503, 504, 401, 403])("propagates upstream %s so the title route can retry", async (status) => {
    const error = new TmdbApiError("TMDB unavailable", status);
    vi.mocked(tmdbFetch).mockImplementation(async (path) => {
      if (path === "/tv/42") throw error;
      if (path.startsWith("/genre/")) return { genres: [] };
      return { results: [] };
    });
    await expect(getTitleBySlug("tv-42")).rejects.toBe(error);
  });

  it("propagates network errors", async () => {
    const error = new TypeError("fetch failed");
    vi.mocked(tmdbFetch).mockRejectedValue(error);
    await expect(getTitleBySlug("tv-42")).rejects.toBe(error);
  });

  it("returns undefined for an actual title 404", async () => {
    vi.mocked(tmdbFetch).mockImplementation(async (path) => {
      if (path === "/tv/42") throw new TmdbApiError("Missing title", 404);
      if (path.startsWith("/genre/")) return { genres: [] };
      return { results: [] };
    });
    await expect(getTitleBySlug("tv-42")).resolves.toBeUndefined();
  });

  it("does not mistake a genres endpoint 404 for a missing title", async () => {
    const error = new TmdbApiError("Missing genres endpoint", 404);
    vi.mocked(tmdbFetch).mockImplementation(async (path) => {
      if (path.startsWith("/genre/")) throw error;
      if (path === "/tv/42") return { id: 42, name: "Still exists" };
      return { results: [] };
    });
    await expect(getTitleBySlug("tv-42")).rejects.toBe(error);
  });

  it("propagates missing configuration for a valid upstream identity", async () => {
    vi.mocked(hasTmdbCredentials).mockReturnValue(false);
    await expect(getTitleBySlug("tv-42")).rejects.toThrow("not configured");
  });

  it("rejects an invalid identity without upstream requests", async () => {
    await expect(getTitleBySlug("movie-42-extra")).resolves.toBeUndefined();
    expect(tmdbFetch).not.toHaveBeenCalled();
  });

  it("loads a valid title outside the catalog without inventing a release", async () => {
    await expect(getTitleBySlug("tv-42")).resolves.toMatchObject({ id: "tv-42", releaseDate: "" });
  });
});

describe("sample catalog detail links", () => {
  it.each([true, false])("resolves sample slugs with TMDB configured=%s without replacing dates", async (configured) => {
    vi.mocked(hasTmdbCredentials).mockReturnValue(configured);
    await expect(getTitleBySlug(mediaTitles[0].slug)).resolves.toMatchObject({
      id: mediaTitles[0].id, releaseDate: mediaTitles[0].releaseDate,
    });
    expect(tmdbFetch).not.toHaveBeenCalled();
  });

  it("keeps the source dates in the fallback catalog", async () => {
    vi.mocked(hasTmdbCredentials).mockReturnValue(false);
    const catalog = await getCatalog();
    expect(catalog.trending.map(({ id, releaseDate }) => ({ id, releaseDate }))).toEqual(
      [...mediaTitles].sort((a, b) => b.popularity - a.popularity).map(({ id, releaseDate }) => ({ id, releaseDate })),
    );
  });
});
