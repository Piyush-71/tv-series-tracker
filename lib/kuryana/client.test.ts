import { afterEach, describe, expect, it, vi } from "vitest";
import { createKuryanaClient } from "./client";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("Kuryana request resilience", () => {
  it("coalesces concurrent requests, caches decoded successes, and refreshes expired entries", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(async () => Response.json({ results: [] }));
    const request = createKuryanaClient(fetcher);
    const decode = vi.fn(() => ["decoded"]);
    expect(await Promise.all([request("/search/q/signal", decode, 10), request("/search/q/signal", decode, 10)])).toEqual([["decoded"], ["decoded"]]);
    await request("/search/q/signal", decode, 10);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10_001);
    await request("/search/q/signal", decode, 10);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache malformed successful HTTP responses or rate-limit errors", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(new Response("Busy", { status: 429 }))
      .mockResolvedValueOnce(Response.json(["recovered"]));
    const request = createKuryanaClient(fetcher);
    const decode = (value: unknown) => { if (!Array.isArray(value)) throw new Error("Invalid response"); return value; };
    await expect(request("/id/42-show", decode)).rejects.toThrow("Invalid response");
    await expect(request("/id/42-show", decode)).rejects.toMatchObject({ status: 429 });
    await expect(request("/id/42-show", decode)).resolves.toEqual(["recovered"]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("aborts slow responses within the provider budget", async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    await expect(createKuryanaClient(fetcher, 10)("/search/q/love", (value) => value)).rejects.toThrow("timed out");
  });

  it("supports a self-hosted endpoint and an immediate kill switch", async () => {
    vi.stubEnv("KURYANA_BASE_URL", "http://127.0.0.1:3999/");
    const fetcher = vi.fn().mockResolvedValue(Response.json([]));
    const request = createKuryanaClient(fetcher);
    await request("/search/q/love", (value) => value);
    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:3999/search/q/love", expect.objectContaining({ cache: "no-store" }));
    vi.stubEnv("KURYANA_ENABLED", "false");
    await expect(request("/search/q/love", (value) => value)).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
