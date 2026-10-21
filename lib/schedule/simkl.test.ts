import { afterEach, describe, expect, it, vi } from "vitest";
import { simklScheduleSource } from "@/lib/schedule/simkl";
import { createScheduleService } from "@/lib/schedule/service";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => async () => {
    const value = await fn();
    if (Buffer.byteLength(JSON.stringify(value)) > 2 * 1024 * 1024)
      throw new Error("Next data-cache entry exceeds 2 MB");
    return value;
  },
}));
afterEach(() => vi.unstubAllGlobals());

function row(id: number) {
  return {
    title: `Show ${id}`,
    date: "2030-01-01T12:00:00Z",
    url: `https://simkl.com/tv/${id}`,
    ids: { simkl_id: id, slug: `show-${id}` },
    episode: { season: 1, episode: 2 },
  };
}

describe("live Simkl schedule", () => {
  it("reports a source outage instead of inventing episodes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );
    await expect(simklScheduleSource.list()).rejects.toThrow(
      /schedule.*unavailable/i,
    );
  });
  it("does not turn a valid empty calendar into fictional episodes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    await expect(simklScheduleSource.list()).resolves.toEqual([]);
  });
  it("reports an invalid source document as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "invalid" })),
    );
    await expect(simklScheduleSource.list()).rejects.toThrow(
      /schedule.*unavailable/i,
    );
  });
  it("resolves followed shows beyond the compact dashboard selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            Array.from({ length: 6_402 }, (_, index) => row(index + 1)),
          ),
        ),
    );
    const schedule = createScheduleService(simklScheduleSource);
    await expect(
      schedule.getShow("6402", new Date("2029-01-01")),
    ).resolves.toMatchObject({ showId: "6402" });
  });
});
