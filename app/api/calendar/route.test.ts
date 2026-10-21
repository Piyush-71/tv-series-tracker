import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/calendar/route";
import { getTitleBySlug } from "@/lib/tmdb/service";
import { getScheduledShowsByTrackerIds } from "@/lib/schedule";

vi.mock("@/lib/tmdb/service", () => ({ getTitleBySlug: vi.fn() }));
vi.mock("@/lib/schedule", () => ({ getScheduledShowsByTrackerIds: vi.fn() }));
vi.mock("@/lib/api", () => ({
  getRequestKey: () => "test",
  publicApiLimiter: { check: () => ({ allowed: true }) },
}));

function request(ids: string[]) {
  return new Request(
    `https://cinecount.example/api/calendar?ids=${ids.join(",")}`,
  );
}
function title(id: string) {
  return {
    id,
    slug: id,
    title: id,
    poster: "https://example.com/poster.jpg",
    nextEpisode: {
      id: "next",
      name: "Next",
      airDate: "2030-01-01",
      seasonNumber: 1,
      episodeNumber: 2,
      rating: 0,
      overview: "",
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getTitleBySlug).mockImplementation(
    async (id) => title(id) as Awaited<ReturnType<typeof getTitleBySlug>>,
  );
  vi.mocked(getScheduledShowsByTrackerIds).mockResolvedValue([]);
});
describe("calendar batches", () => {
  it.each([false, true])("uses an exact Simkl episode for a TMDB identity even when metadata is absent or failed (%s)", async (failed) => {
    vi.mocked(getTitleBySlug).mockImplementation(async () => {
      if (failed) throw new Error("TMDB unavailable");
      return { ...title("tv-42"), nextEpisode: undefined } as Awaited<ReturnType<typeof getTitleBySlug>>;
    });
    const episode = { id: "simkl-next", showId: "77", title: "Known schedule", slug: "known", poster: "/poster.jpg", seasonNumber: 2, episodeNumber: 1, airsAt: "2030-01-02T12:00:00Z", precision: "datetime" as const, kind: "episode" as const, sourceUrl: "https://simkl.com/tv/77" };
    vi.mocked(getScheduledShowsByTrackerIds).mockResolvedValue([{ id: "tv-42", show: { ...episode, tmdbId: "42", next: episode, episodes: [episode] } }]);
    const body = await (await GET(request(["tv-42"]))).json();
    expect(body.results).toMatchObject([{ title: { id: "tv-42" }, episode: { airDate: "2030-01-02T12:00:00Z" } }]);
    expect(body.failedIds).toEqual([]);
    expect(body.noEpisodeIds).toEqual([]);
  });
  it("rejects oversized batches explicitly instead of silently dropping the 26th ID", async () => {
    const response = await GET(
      request(Array.from({ length: 26 }, (_, i) => `tv-${i + 1}`)),
    );
    expect(response.status).toBe(400);
    expect(getTitleBySlug).not.toHaveBeenCalled();
  });
  it("includes followed Simkl shows and resolves them in one source lookup", async () => {
    vi.mocked(getScheduledShowsByTrackerIds).mockResolvedValue([
      { id: "simkl-900", show: {
        showId: "900",
        slug: "show",
        title: "Simkl show",
        poster: "https://example.com/poster.jpg",
        episodes: [],
        next: {
          id: "simkl-next",
          showId: "900",
          title: "Simkl show",
          slug: "show",
          poster: "https://example.com/poster.jpg",
          precision: "datetime",
          kind: "episode",
          sourceUrl: "https://simkl.com/tv/900",
          seasonNumber: 2,
          episodeNumber: 4,
          airsAt: "2030-01-02T12:00:00Z",
        },
      } },
    ] as Awaited<ReturnType<typeof getScheduledShowsByTrackerIds>>);
    const body = await (await GET(request(["simkl-900", "tv-1"]))).json();
    expect(
      body.results.map((entry: { title: { id: string } }) => entry.title.id),
    ).toEqual(["tv-1", "simkl-900"]);
    expect(getScheduledShowsByTrackerIds).toHaveBeenCalledWith(["simkl-900", "tv-1"]);
  });
  it("keeps successful entries and distinguishes failures from missing schedules", async () => {
    vi.mocked(getTitleBySlug).mockImplementation(async (id) => {
      if (id === "tv-2") throw new Error("temporary outage");
      if (id === "tv-3") return undefined;
      return title(id) as Awaited<ReturnType<typeof getTitleBySlug>>;
    });
    const response = await GET(request(["tv-1", "tv-2", "tv-3", "simkl-99"]));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      results: [{ title: { id: "tv-1" } }],
      failedIds: ["tv-2"],
      unresolvedIds: ["simkl-99", "tv-3"],
    });
  });
  it("validates IDs instead of silently discarding unsupported ones", async () => {
    expect((await GET(request(["tv-1", "bad-id"]))).status).toBe(400);
  });
  it("reports a Simkl outage without losing available TMDB episodes", async () => {
    vi.mocked(getScheduledShowsByTrackerIds).mockRejectedValue(
      new Error("Schedule unavailable"),
    );
    const body = await (await GET(request(["simkl-900", "tv-1"]))).json();
    expect(body).toMatchObject({
      results: [{ title: { id: "tv-1" } }],
      failedIds: ["simkl-900"],
      unresolvedIds: [],
    });
  });
  it("bounds concurrent title lookups while processing every accepted ID", async () => {
    let active = 0;
    let peak = 0;
    vi.mocked(getTitleBySlug).mockImplementation(async (id) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return title(id) as Awaited<ReturnType<typeof getTitleBySlug>>;
    });
    const body = await (
      await GET(
        request(Array.from({ length: 25 }, (_, index) => `tv-${index + 1}`)),
      )
    ).json();
    expect(body.results).toHaveLength(25);
    expect(peak).toBeLessThanOrEqual(4);
  });
});
