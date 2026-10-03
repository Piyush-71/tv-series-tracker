import { Resolver } from "node:dns";
import { Agent, fetch as fetchWithDispatcher } from "undici";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

type TmdbFetchOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  revalidate?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const publicDnsResolver = new Resolver();
publicDnsResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const publicDnsDispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      const family = options.family === 6 ? 6 : 4;
      const resolve = family === 6
        ? publicDnsResolver.resolve6.bind(publicDnsResolver)
        : publicDnsResolver.resolve4.bind(publicDnsResolver);

      resolve(hostname, (error, addresses) => {
        if (error) return callback(error, [], family);
        if (options.all) return callback(null, addresses.map((address) => ({ address, family })));
        callback(null, addresses[0], family);
      });
    },
  },
});

export class TmdbApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TMDB_API_READ_ACCESS_TOKEN is not configured.");
  }

  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };
}

export function hasTmdbCredentials() {
  return Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN);
}

export async function tmdbFetch<T>(path: string, options: TmdbFetchOptions = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    throw new TmdbApiError(`TMDB request failed for ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

async function fetchWithRetry(url: URL, options: TmdbFetchOptions) {
  const attempts = 3;
  let usePublicDns = false;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = usePublicDns
        ? await fetchWithDispatcher(url, {
            dispatcher: publicDnsDispatcher,
            headers: getAuthHeaders(),
            signal: controller.signal,
          })
        : await fetch(url, {
            headers: getAuthHeaders(),
            next: { revalidate: options.revalidate ?? 60 * 60 },
            signal: controller.signal,
          });

      if (!isRetryableStatus(response.status) || attempt === attempts) {
        return response;
      }
    } catch (error) {
      if (controller.signal.aborted && usePublicDns) {
        throw new TmdbApiError(`TMDB request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`, 504);
      }
      if (attempt === attempts) throw error;
      usePublicDns = true;
    } finally {
      clearTimeout(timeout);
    }

    await wait(attempt * 250);
  }

  throw new Error("TMDB retry loop ended unexpectedly.");
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
