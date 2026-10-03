import { NextResponse } from "next/server";
import { getTitleBySlug } from "@/lib/tmdb/service";
import { getRequestKey, publicApiLimiter } from "@/lib/api";

export async function GET(request: Request) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many calendar requests." } }, { status: 429 });
  const ids = Array.from(new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => /^(tv|movie)-\d+$/.test(id)))).slice(0, 25);
  if (!ids.length) return NextResponse.json({ results: [] });

  try {
    const titles = (await Promise.all(ids.map((id) => getTitleBySlug(id)))).filter(Boolean);
    const results = titles
      .filter((title) => title?.nextEpisode)
      .map((title) => ({ title: { id: title!.id, slug: title!.slug, title: title!.title, poster: title!.poster }, episode: title!.nextEpisode! }))
      .sort((a, b) => new Date(a.episode.airDate ?? "9999-12-31").getTime() - new Date(b.episode.airDate ?? "9999-12-31").getTime());
    return NextResponse.json({ results });
  } catch (error) {
    console.error(JSON.stringify({ event: "api.calendar_failed", error: String(error) }));
    return NextResponse.json({ error: { code: "CALENDAR_UNAVAILABLE", message: "The episode calendar is temporarily unavailable." } }, { status: 502 });
  }
}
