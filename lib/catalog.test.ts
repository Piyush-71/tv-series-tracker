import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mediaTitles } from "@/data/media";
import type { MediaTitle } from "@/types/media";
import * as tmdb from "@/lib/tmdb/service";
import { getMdlEpisodes, getMdlTitle, searchMdlTitles } from "@/lib/kuryana/service";
import { getSeasonEpisodes, getTitleBySlug, mergeSearchTitles, searchCatalog } from "./catalog";

vi.mock("@/lib/tmdb/service", () => ({ searchTitles: vi.fn(), getTitleBySlug: vi.fn(), getSeasonEpisodes: vi.fn() }));
vi.mock("@/lib/kuryana/service", () => ({ searchMdlTitles: vi.fn(), getMdlTitle: vi.fn(), getMdlEpisodes: vi.fn() }));
const western: MediaTitle = { ...mediaTitles[0], id: "tv-42", slug: "tv-42", title: "Hidden Love", type: "tv", releaseDate: "2023-06-20", originCountries: ["CN"] };
const asian: MediaTitle = { ...western, id: "mdl-729705-hidden-love", slug: "mdl-729705-hidden-love", source: "mydramalist", releaseDate: "", releaseYear: 2023 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tmdb.searchTitles).mockResolvedValue([western]);
  vi.mocked(searchMdlTitles).mockResolvedValue([asian]);
});
afterEach(() => vi.unstubAllEnvs());

describe("combined title search", () => {
  it("preserves the TMDB identity for one unambiguous cross-provider match", async () => {
    expect(await searchCatalog(" Hidden Love ")).toEqual({ results: [western], partial: false });
    expect(searchMdlTitles).toHaveBeenCalledWith("Hidden Love");
  });

  it("keeps different years, countries, formats and ambiguous editions separate", () => {
    for (const changed of [{ releaseYear: 2025 }, { originCountries: ["TH"] }, { type: "movie" as const }, { releaseYear: undefined }]) {
      expect(mergeSearchTitles([western], [{ ...asian, ...changed }])).toHaveLength(2);
    }
    expect(mergeSearchTitles([western, { ...western, id: "tv-43" }], [asian])).toHaveLength(3);
    expect(mergeSearchTitles([western], [asian, { ...asian, id: "mdl-43-hidden-love" }])).toHaveLength(3);
  });

  it("keeps Asian matches visible in the short overlay and puts exact matches first", () => {
    const titles = Array.from({ length: 20 }, (_, index) => ({ ...western, id: `tv-${index}`, title: `Western title ${index}` }));
    expect(mergeSearchTitles(titles, [asian], "Hidden Love")[0]).toBe(asian);
    expect(mergeSearchTitles(titles, [asian], "偷偷藏不住").slice(0, 8)).toContain(asian);
  });

  it("retains Western results during a scraper outage and Asian results during a TMDB outage", async () => {
    vi.mocked(searchMdlTitles).mockRejectedValueOnce(new Error("rate limited"));
    expect(await searchCatalog("Love")).toEqual({ results: [western], partial: true });
    vi.mocked(tmdb.searchTitles).mockRejectedValueOnce(new Error("TMDB unavailable"));
    expect(await searchCatalog("Love")).toEqual({ results: [asian], partial: true });
  });

  it("does not report a full outage as an empty successful search", async () => {
    vi.mocked(tmdb.searchTitles).mockRejectedValue(new Error("offline"));
    vi.mocked(searchMdlTitles).mockRejectedValue(new Error("offline"));
    await expect(searchCatalog("Love")).rejects.toThrow("unavailable");
  });

  it("avoids the scraper for blank/short queries and when explicitly disabled", async () => {
    await searchCatalog("");
    await searchCatalog("a");
    vi.stubEnv("KURYANA_ENABLED", "false");
    expect((await searchCatalog("Love")).partial).toBe(false);
    expect(searchMdlTitles).not.toHaveBeenCalled();
    await expect(searchCatalog("a".repeat(101))).rejects.toThrow("too long");
  });
});

describe("provider-aware detail and episode resolution", () => {
  it("routes existing titles and seasons to TMDB without touching Kuryana", async () => {
    vi.mocked(tmdb.getTitleBySlug).mockResolvedValue(western);
    expect(await getTitleBySlug("tv-42")).toEqual(western);
    await getSeasonEpisodes("tv-42", 2);
    expect(tmdb.getSeasonEpisodes).toHaveBeenCalledWith("tv-42", 2);
    expect(getMdlTitle).not.toHaveBeenCalled();
  });

  it("keeps an MDL title available when ancillary episodes fail", async () => {
    vi.mocked(getMdlTitle).mockResolvedValue(asian);
    vi.mocked(getMdlEpisodes).mockRejectedValue(new Error("episode timeout"));
    expect(await getTitleBySlug(asian.slug)).toMatchObject({ id: asian.id, nextEpisode: undefined });
    await expect(getSeasonEpisodes(asian.slug, 1)).rejects.toThrow("episode timeout");
    expect(tmdb.getTitleBySlug).not.toHaveBeenCalled();
  });
});
