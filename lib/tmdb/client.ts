const TMDB_BASE_URL = "https://api.themoviedb.org/3";

type TmdbFetchOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  revalidate?: number;
};

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

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        next: { revalidate: options.revalidate ?? 60 * 60 },
      });

      if (!isRetryableStatus(response.status) || attempt === attempts) {
        return response;
      }
    } catch (error) {
      if (attempt === attempts) throw error;
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
