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

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    };
  }

  return {
    accept: "application/json",
  };
}

export function hasTmdbCredentials() {
  return Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY);
}

export async function tmdbFetch<T>(path: string, options: TmdbFetchOptions = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  const apiKey = process.env.TMDB_API_KEY;

  if (!process.env.TMDB_API_READ_ACCESS_TOKEN && apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    next: { revalidate: options.revalidate ?? 60 * 60 },
  });

  if (!response.ok) {
    throw new TmdbApiError(`TMDB request failed for ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}
