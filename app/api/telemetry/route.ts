import { NextResponse } from "next/server";
import { getRequestKey, publicApiLimiter } from "@/lib/api";

const allowedEvents = new Set(["ui.error", "notification.delivered", "notification.failed"]);

export async function POST(request: Request) {
  const rate = publicApiLimiter.check(`telemetry:${getRequestKey(request)}`);
  if (!rate.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many events." } }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Expected a JSON body." } }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("event" in body) || typeof body.event !== "string" || !allowedEvents.has(body.event)) {
    return NextResponse.json({ error: { code: "INVALID_EVENT", message: "Unsupported telemetry event." } }, { status: 400 });
  }

  const safeBody = Object.fromEntries(Object.entries(body).filter(([key, value]) => ["event", "titleId", "digest"].includes(key) && typeof value === "string"));
  console.info(JSON.stringify({ ...safeBody, timestamp: new Date().toISOString() }));
  return new NextResponse(null, { status: 204 });
}
