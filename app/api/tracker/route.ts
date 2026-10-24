import { auth } from "@clerk/nextjs/server";
import { createRateLimiter } from "@/lib/api";
import { importTrackerData } from "@/lib/tracker";
import {
  readAccountTracker,
  writeAccountTracker,
} from "@/lib/account-tracker/server";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return error("UNAUTHORIZED", "Sign in to sync your tracker.", 401);
  if (!limiter.check(userId).allowed)
    return error("RATE_LIMITED", "Please try again shortly.", 429);
  try {
    return Response.json(
      { userId, ...(await readAccountTracker(userId)) },
      { headers },
    );
  } catch {
    return error(
      "UNAVAILABLE",
      "Account sync is unavailable. Your changes remain saved on this device.",
      503,
    );
  }
}

export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return error("FORBIDDEN", "A same-origin request is required.", 403);
  const { userId } = await auth();
  if (!userId)
    return error("UNAUTHORIZED", "Sign in to sync your tracker.", 401);
  if (!limiter.check(userId).allowed)
    return error("RATE_LIMITED", "Please try again shortly.", 429);
  let input;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1_000_000) {
          await reader.cancel();
          return error(
            "TOO_LARGE",
            "Tracker data exceeds the 1 MB sync limit. Export a backup from Profile.",
            413,
          );
        }
        chunks.push(value);
      }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (input.userId !== userId)
      return error(
        "FORBIDDEN",
        "The account has changed. Reload and try again.",
        403,
      );
    if (
      !Number.isSafeInteger(input.revision) ||
      input.revision < 0 ||
      input.revision >= 2_147_483_647
    )
      throw new Error("Invalid revision");
    input.data = importTrackerData(JSON.stringify(input.data));
  } catch {
    return error("INVALID_DATA", "Invalid tracker data.", 400);
  }
  try {
    const saved = await writeAccountTracker(userId, input.revision, input.data);
    return saved
      ? Response.json({ userId, ...saved }, { headers })
      : error(
          "CONFLICT",
          "Your account changed on another device. Refresh and retry the changes.",
          409,
        );
  } catch {
    return error(
      "UNAVAILABLE",
      "Account sync is unavailable. Your changes remain saved on this device.",
      503,
    );
  }
}
