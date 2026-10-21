import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useCollection } from "./use-collection";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("requests every ID in bounded batches, including entries beyond 50", async () => {
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    const { ids } = JSON.parse(options.body as string) as { ids: string[] };
    return { ok: true, json: async () => ({ results: ids.map((id) => ({ id, status: "missing" })) }) };
  });
  vi.stubGlobal("fetch", fetcher);
  const ids = Array.from({ length: 56 }, (_, index) => `tv-${index + 1}`);
  const { result } = renderHook(() => useCollection(ids));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entries.map((entry) => entry.id)).toEqual(ids);
  expect(fetcher.mock.calls.map(([, options]) => JSON.parse(options.body as string).ids.length)).toEqual([25, 25, 6]);
});

it("keeps failed-batch IDs visible and discards an old collection after switching identities", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const { result, rerender } = renderHook(({ ids }) => useCollection(ids), { initialProps: { ids: ["tv-1"] } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entries).toEqual([{ id: "tv-1", status: "unavailable" }]);
  rerender({ ids: ["tv-2"] });
  expect(result.current.entries.map((entry) => entry.id)).toEqual(["tv-2"]);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entries).toEqual([{ id: "tv-2", status: "unavailable" }]);
});
