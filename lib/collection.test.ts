import { expect, it, vi } from "vitest";
import { mediaTitles } from "@/data/media";
import { createCollectionResolver } from "./collection";
import type { ShowSchedule } from "@/types/schedule";

vi.mock("@/lib/schedule", () => ({ getFollowableSchedule: vi.fn(), getShowSchedule: vi.fn() }));
vi.mock("@/lib/tmdb/service", () => ({ getTitleBySlug: vi.fn() }));

it("resolves every requested ID rather than intersecting the discovery catalog or taking 50", async () => {
  const title = vi.fn(async (id: string) => ({ ...mediaTitles[0], id, slug: id }));
  const resolve = createCollectionResolver({ title, show: vi.fn(), schedule: async () => [] });
  const ids = Array.from({ length: 55 }, (_, index) => `tv-${index + 1000}`);
  const entries = await resolve(ids);
  expect(entries.map((entry) => entry.title?.id)).toEqual(ids);
  expect(title).toHaveBeenCalledTimes(55);
});

it("retains missing, failed, and unsupported saved identities with distinct states", async () => {
  const resolve = createCollectionResolver({
    title: async (id) => { if (id === "tv-2") throw new Error("timeout"); return undefined; },
    show: vi.fn(), schedule: async () => { throw new Error("schedule unavailable"); },
  });
  expect(await resolve(["tv-1", "tv-2", "unknown-id"])).toEqual([
    { id: "tv-1", status: "missing" }, { id: "tv-2", status: "unavailable" }, { id: "unknown-id", status: "unsupported" },
  ]);
});

it("resolves a followed Simkl show directly, outside the selected schedule", async () => {
  const episode = { id: "e1", showId: "77", title: "Followed show", slug: "followed-show", poster: "/poster.jpg", seasonNumber: 2, episodeNumber: 1, airsAt: "2099-01-01T00:00:00Z", precision: "datetime" as const, kind: "season-premiere" as const, sourceUrl: "https://simkl.com/tv/77" };
  const show: ShowSchedule = { ...episode, next: episode, episodes: [episode] };
  const lookup = vi.fn(async () => show);
  const resolve = createCollectionResolver({ title: vi.fn(), show: lookup, schedule: async () => [] });
  expect(await resolve(["simkl-77"])).toEqual([{ id: "simkl-77", status: "ready", episode }]);
  expect(lookup).toHaveBeenCalledWith("77");
});
