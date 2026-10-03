import { NextResponse } from "next/server";
import { getSeasonEpisodes } from "@/lib/tmdb/service";
import { getRequestKey, publicApiLimiter } from "@/lib/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; season: string }> },
) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many episode requests." } }, { status: 429 });
  const { slug, season } = await context.params;
  const seasonNumber = Number(season);

  if (!Number.isInteger(seasonNumber) || seasonNumber < 0 || seasonNumber > 100) {
    return NextResponse.json(
      { error: { code: "INVALID_SEASON", message: "Season must be a whole number between 0 and 100." } },
      { status: 400 },
    );
  }

  try {
    const results = await getSeasonEpisodes(slug, seasonNumber);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(JSON.stringify({ event: "tmdb.season_failed", slug, seasonNumber, error: String(error) }));
    return NextResponse.json(
      { error: { code: "SEASON_UNAVAILABLE", message: "Episode data is temporarily unavailable." } },
      { status: 502 },
    );
  }
}
