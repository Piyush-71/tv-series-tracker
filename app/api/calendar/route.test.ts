import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/calendar/route";
import { getTitleBySlug } from "@/lib/tmdb/service";
import { getScheduledShowsByIds } from "@/lib/schedule";

vi.mock("@/lib/tmdb/service", () => ({ getTitleBySlug: vi.fn() }));
vi.mock("@/lib/schedule", () => ({ getScheduledShowsByIds: vi.fn() }));
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
  vi.mocked(getScheduledShowsByIds).mockResolvedValue([]);
});
describe("calendar batches", () => {
  it("rejects oversized batches explicitly instead of silently dropping the 26th ID", async () => {
    const response = await GET(
      request(Array.from({ length: 26 }, (_, i) => `tv-${i + 1}`)),
    );
    expect(response.status).toBe(400);
    expect(getTitleBySlug).not.toHaveBeenCalled();
  });
  it("includes followed Simkl shows and resolves them in one source lookup", async () => {
    vi.mocked(getScheduledShowsByIds).mockResolvedValue([
      {
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
      },
    ] as Awaited<ReturnType<typeof getScheduledShowsByIds>>);
    const body = await (await GET(request(["simkl-900", "tv-1"]))).json();
    expect(
      body.results.map((entry: { title: { id: string } }) => entry.title.id),
    ).toEqual(["tv-1", "simkl-900"]);
    expect(getScheduledShowsByIds).toHaveBeenCalledWith(["900"]);
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
    vi.mocked(getScheduledShowsByIds).mockRejectedValue(
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
