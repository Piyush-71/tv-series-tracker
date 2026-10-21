import { NextResponse } from "next/server";
import { collectionBatchSize, resolveCollection } from "@/lib/collection";
import { getRequestKey, publicApiLimiter } from "@/lib/api";

export async function POST(request: Request) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed) return NextResponse.json({ error: { message: "Too many requests. Try again shortly." } }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: "Send a JSON list of title IDs." } }, { status: 400 });
  }
  const ids = body && typeof body === "object" && "ids" in body ? body.ids : null;
  if (!Array.isArray(ids) || ids.length > collectionBatchSize || ids.some((id) => typeof id !== "string" || !id || id.length > 100)) {
    return NextResponse.json({ error: { message: `Send up to ${collectionBatchSize} title IDs per request.` } }, { status: 400 });
  }
  return NextResponse.json({ results: await resolveCollection(ids) });
}
