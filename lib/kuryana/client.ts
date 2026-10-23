type Fetcher = typeof fetch;

export class KuryanaError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

export function isKuryanaEnabled() {
  return process.env.KURYANA_ENABLED !== "false";
}

/** Successful, decoded responses only; bounded per-worker cache and request coalescing. */
export function createKuryanaClient(fetcher: Fetcher, timeoutMs = 4_000) {
  const responses = new Map<string, { value: unknown; expiresAt: number }>();
  const pending = new Map<string, Promise<unknown>>();

  return async function request<T>(path: string, decode: (value: unknown) => T, ttlSeconds = 600): Promise<T> {
    if (!isKuryanaEnabled()) throw new KuryanaError("Asian drama search is disabled.", 503);
    const base = process.env.KURYANA_BASE_URL?.trim() || "https://kuryana.tbdh.app";
    const url = `${base.replace(/\/$/, "")}${path}`;
    const cached = responses.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const existing = pending.get(url);
    if (existing) return existing as Promise<T>;

    const promise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(url, {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new KuryanaError("MyDramaList data is temporarily unavailable.", response.status);
        const value = decode(await response.json());
        // Reinsert to keep eviction ordered by the latest successful fetch.
        responses.delete(url);
        if (responses.size >= 250) responses.delete(responses.keys().next().value!);
        responses.set(url, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
        return value;
      } catch (error) {
        if (controller.signal.aborted) throw new KuryanaError("MyDramaList request timed out.", 504);
        throw error;
      } finally {
        clearTimeout(timer);
        pending.delete(url);
      }
    })();
    pending.set(url, promise);
    return promise;
  };
}

export const kuryanaRequest = createKuryanaClient((input, init) => fetch(input, init));
