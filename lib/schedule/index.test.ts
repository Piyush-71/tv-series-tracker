import { beforeEach, describe, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { getScheduleDashboard } from "@/lib/schedule";
import { simklScheduleSource } from "@/lib/schedule/simkl";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/schedule/simkl", () => ({
  simklScheduleSource: { list: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
describe("dashboard caching", () => {
  it("does not prerender a successful static outage page that defeats retry", async () => {
    vi.mocked(simklScheduleSource.list).mockRejectedValue(
      new Error("Source unavailable"),
    );
    await expect(getScheduleDashboard()).resolves.toMatchObject({
      unavailable: true,
    });
    expect(connection).toHaveBeenCalledTimes(1);
  });
  it("keeps normal dashboard caching and reads its source only once", async () => {
    vi.mocked(simklScheduleSource.list).mockResolvedValue([]);
    await expect(getScheduleDashboard()).resolves.toEqual({
      trending: [],
      upcoming: [],
      airingSoon: [],
    });
    expect(connection).not.toHaveBeenCalled();
    expect(simklScheduleSource.list).toHaveBeenCalledTimes(1);
  });
});
