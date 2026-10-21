import { auth } from "@clerk/nextjs/server";
import { createRateLimiter } from "@/lib/api";
import {
  parseDeviceToken,
  parsePushSnapshot,
  PushInputError,
} from "@/lib/web-push/model";
import { pushConfigured } from "@/lib/web-push/server";
import { removePushDevice, syncPushDevice } from "@/lib/web-push/store";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const headers = { "Cache-Control": "no-store" };
function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export async function GET() {
  return Response.json(
    {
      configured: pushConfigured(),
      publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
    },
    { headers },
  );
}

async function mutate(request: Request, remove: boolean) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return error("FORBIDDEN", "A same-origin request is required.", 403);
  if (!pushConfigured())
    return error(
      "NOT_CONFIGURED",
      "Background notifications are not configured yet.",
      503,
    );
  try {
    // Bound the actual body, including requests without Content-Length.
    const reader = request.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 150_000) {
          await reader.cancel();
          return error("TOO_LARGE", "Request is too large.", 413);
        }
        chunks.push(value);
      }
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (remove) {
      await removePushDevice(parseDeviceToken(input?.deviceToken));
      return Response.json({ success: true }, { headers });
    }
    const { userId } = await auth();
    if (!userId)
      return error(
        "UNAUTHORIZED",
        "Sign in to enable background notifications.",
        401,
      );
    if (!limiter.check(userId).allowed)
      return error("RATE_LIMITED", "Try again in a minute.", 429);
    const snapshot = parsePushSnapshot(input);
    if (snapshot.userId !== userId)
      return error(
        "FORBIDDEN",
        "The active account changed. Please retry.",
        403,
      );
    const reminders = await syncPushDevice(snapshot);
    return Response.json({ reminders }, { headers });
  } catch (cause) {
    if (cause instanceof PushInputError || cause instanceof SyntaxError)
      return error("INVALID_INPUT", cause.message, 400);
    console.error(JSON.stringify({ event: "push.storage.failed" }));
    return error(
      "UNAVAILABLE",
      "Could not save notification settings. Please retry.",
      503,
    );
  }
}

export function POST(request: Request) {
  return mutate(request, false);
}
export function DELETE(request: Request) {
  return mutate(request, true);
}
