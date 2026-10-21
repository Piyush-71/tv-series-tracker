import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resolveCollection } from "@/lib/collection";

vi.mock("@/lib/collection", () => ({ collectionBatchSize: 25, resolveCollection: vi.fn() }));
vi.mock("@/lib/api", () => ({ getRequestKey: () => "test", publicApiLimiter: { check: () => ({ allowed: true }) } }));
beforeEach(() => vi.mocked(resolveCollection).mockReset());

it("does not silently truncate an oversized batch", async () => {
  const response = await POST(new Request("http://localhost/api/collection", { method: "POST", body: JSON.stringify({ ids: Array.from({ length: 26 }, (_, index) => `tv-${index + 1}`) }) }));
  expect(response.status).toBe(400);
  expect(resolveCollection).not.toHaveBeenCalled();
});

it("returns an explicit result for every valid requested identity", async () => {
  vi.mocked(resolveCollection).mockResolvedValue([{ id: "tv-1", status: "missing" }, { id: "simkl-2", status: "unavailable" }]);
  const response = await POST(new Request("http://localhost/api/collection", { method: "POST", body: JSON.stringify({ ids: ["tv-1", "simkl-2"] }) }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ results: [{ id: "tv-1", status: "missing" }, { id: "simkl-2", status: "unavailable" }] });
});
