import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createKuryanaClient } from "./client";
import { getMdlEpisodes, getMdlTitle, searchMdlTitles } from "./service";

const mocks = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, kuryanaRequest: (...args: Parameters<ReturnType<typeof createKuryanaClient>>) => actual.createKuryanaClient(mocks.fetcher)(...args) };
});
beforeEach(() => mocks.fetcher.mockReset());
afterEach(() => vi.unstubAllEnvs());

it("reads real Kuryana search envelopes and encodes native-title queries", async () => {
  mocks.fetcher.mockResolvedValue(Response.json({ results: { dramas: [
    { slug: "729705-hidden-love", title: "Hidden Love", type: "Chinese Drama", year: 2023 },
    { title: "Malformed row" },
  ] } }));
  expect(await searchMdlTitles("偷偷藏不住")).toMatchObject([{ id: "mdl-729705-hidden-love", type: "tv", originCountries: ["CN"] }]);
  expect(mocks.fetcher.mock.calls[0][0]).toContain(encodeURIComponent("偷偷藏不住"));
});

it("distinguishes documented no-results responses from scraper outages", async () => {
  mocks.fetcher.mockResolvedValueOnce(Response.json({ error: true, code: 404, description: "404 Not Found" }));
  expect(await searchMdlTitles("unknown")).toEqual([]);
  mocks.fetcher.mockResolvedValueOnce(Response.json({}));
  await expect(searchMdlTitles("love")).rejects.toThrow("unavailable");
});

it("rejects malformed saved slugs before fetching and never fabricates later MDL seasons", async () => {
  expect(await getMdlTitle("mdl-42-../../evil")).toBeUndefined();
  expect(await getMdlEpisodes("mdl-42-show", 2)).toEqual([]);
  expect(mocks.fetcher).not.toHaveBeenCalled();
});
