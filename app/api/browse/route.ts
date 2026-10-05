import { NextResponse } from "next/server";
import { getRequestKey, publicApiLimiter } from "@/lib/api";
import { BrowseInputError, parseBrowseQuery } from "@/lib/browse/query";
import { BrowseSnapshotChanged, getBrowsePage } from "@/lib/browse/service";

export async function GET(request: Request) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed) return NextResponse.json({ error: { message: "Too many requests. Try again shortly." } }, { status: 429 });
  try {
    return NextResponse.json(await getBrowsePage(parseBrowseQuery(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof BrowseInputError) return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    if (error instanceof BrowseSnapshotChanged) return NextResponse.json({ error: { message: error.message } }, { status: 409 });
    console.error(JSON.stringify({ event: "browse.failed", error: String(error) }));
    return NextResponse.json({ error: { message: "Browse data is temporarily unavailable. Try again shortly." } }, { status: 502 });
  }
}
