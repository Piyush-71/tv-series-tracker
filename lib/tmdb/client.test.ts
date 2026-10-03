import { afterEach, describe, expect, it, vi } from "vitest";
import { tmdbFetch } from "@/lib/tmdb/client";

const { publicDnsFetch } = vi.hoisted(() => ({ publicDnsFetch: vi.fn() }));

vi.mock("undici", () => ({
  Agent: class {},
  fetch: publicDnsFetch,
}));

describe("TMDB client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    publicDnsFetch.mockReset();
  });

  it("stops retrying when the upstream request exceeds its timeout", async () => {
    vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
    ));
    publicDnsFetch.mockImplementation((_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
    );

    await expect(tmdbFetch("/discover/movie", { timeoutMs: 10 })).rejects.toThrow("TMDB request timed out");
  });

  it("retries through public DNS when the system network path cannot reach TMDB", async () => {
    vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    publicDnsFetch.mockResolvedValue(new Response(JSON.stringify({ source: "tmdb" }), { status: 200 }));

    await expect(tmdbFetch<{ source: string }>("/discover/movie", { timeoutMs: 10 })).resolves.toEqual({ source: "tmdb" });
    expect(publicDnsFetch).toHaveBeenCalledOnce();
  });
});
