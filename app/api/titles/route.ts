import { NextResponse } from "next/server";
import { getDiscoveryPage } from "@/lib/tmdb/service";
import { ApiInputError, getRequestKey, parseTitleQuery, publicApiLimiter } from "@/lib/api";

export async function GET(request: Request) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many catalog requests. Try again shortly." } }, { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } });
  try {
    const query = parseTitleQuery(new URL(request.url).searchParams);
    const data = await getDiscoveryPage(query);
    return NextResponse.json({ ...data, hasMore: data.page < data.totalPages }, { headers: { "x-ratelimit-remaining": String(rate.remaining) } });
  } catch (error) {
    if (error instanceof ApiInputError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 400 });
    console.error(JSON.stringify({ event: "api.titles_failed", error: String(error) }));
    return NextResponse.json({ error: { code: "CATALOG_UNAVAILABLE", message: "The catalog is temporarily unavailable." } }, { status: 502 });
  }
}
