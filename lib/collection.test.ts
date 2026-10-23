import { expect, it, vi } from "vitest";
import { mediaTitles } from "@/data/media";
import { createCollectionResolver, resolveCollection } from "./collection";
import { getScheduledShowsByTrackerIds } from "@/lib/schedule";
import { getTitleBySlug } from "@/lib/catalog";

vi.mock("@/lib/schedule", () => ({ getScheduledShowsByTrackerIds: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getTitleBySlug: vi.fn() }));

it("resolves every requested ID rather than intersecting the discovery catalog or taking 50", async () => {
  const title = vi.fn(async (id: string) => ({ ...mediaTitles[0], id, slug: id }));
  const resolve = createCollectionResolver({ title, schedule: async () => [] });
  const ids = Array.from({ length: 55 }, (_, index) => `tv-${index + 1000}`);
  const entries = await resolve(ids);
  expect(entries.map((entry) => entry.title?.id)).toEqual(ids);
  expect(title).toHaveBeenCalledTimes(55);
});

it("retains missing, failed, and unsupported saved identities with distinct states", async () => {
  const resolve = createCollectionResolver({
    title: async (id) => { if (id === "tv-2") throw new Error("timeout"); return undefined; },
    schedule: async () => { throw new Error("schedule unavailable"); },
  });
  expect(await resolve(["tv-1", "tv-2", "unknown-id"])).toEqual([
    { id: "tv-1", status: "missing" }, { id: "tv-2", status: "unavailable" }, { id: "unknown-id", status: "unsupported" },
  ]);
});

it("resolves saved MDL slugs and preserves them during an outage without changing existing TMDB IDs", async () => {
  const id = "mdl-729705-hidden-love";
  const resolve = createCollectionResolver({
    title: async (slug) => ({ ...mediaTitles[0], id: slug, slug }),
    schedule: vi.fn(async () => []),
  });
  expect((await resolve(["tv-42", id])).map((entry) => entry.title?.id)).toEqual(["tv-42", id]);
  const unavailable = createCollectionResolver({ title: async () => { throw new Error("upstream timeout"); }, schedule: vi.fn() });
  expect(await unavailable([id])).toEqual([{ id, status: "unavailable" }]);
});

it("resolves a followed Simkl show directly, outside the selected schedule", async () => {
  const episode = { id: "e1", showId: "77", title: "Followed show", slug: "followed-show", poster: "/poster.jpg", seasonNumber: 2, episodeNumber: 1, airsAt: "2099-01-01T00:00:00Z", precision: "datetime" as const, kind: "season-premiere" as const, sourceUrl: "https://simkl.com/tv/77" };
  const lookup = vi.fn(async () => [{ id: "simkl-77", episode }]);
  const resolve = createCollectionResolver({ title: vi.fn(), schedule: lookup });
  expect(await resolve(["simkl-77"])).toEqual([{ id: "simkl-77", status: "ready", episode }]);
  expect(lookup).toHaveBeenCalledWith(["simkl-77"]);
});

it("retains the full-feed episode for a mapped TV identity when metadata fails", async () => {
  const episode = { id: "next", showId: "1001", tmdbId: "1001", title: "Outside the selection", slug: "outside", poster: "/poster.jpg", seasonNumber: 1, episodeNumber: 2, airsAt: "2099-01-01T00:00:00Z", precision: "datetime" as const, kind: "episode" as const, sourceUrl: "https://simkl.com/tv/1001" };
  vi.mocked(getScheduledShowsByTrackerIds).mockResolvedValue([{ id: "tv-1001", show: { ...episode, next: episode, episodes: [episode] } }]);
  vi.mocked(getTitleBySlug).mockRejectedValue(new Error("TMDB unavailable"));
  expect(await resolveCollection(["tv-1001"])).toEqual([{ id: "tv-1001", status: "ready", episode }]);
  expect(getScheduledShowsByTrackerIds).toHaveBeenCalledWith(["tv-1001"]);
});
