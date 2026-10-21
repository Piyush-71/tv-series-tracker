import {
  deliverPushReminders,
  pushConfigured,
  validCronAuthorization,
} from "@/lib/web-push/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!validCronAuthorization(request.headers.get("authorization")))
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron credentials." } },
      { status: 401, headers },
    );
  if (!pushConfigured())
    return Response.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message: "Web Push is not configured.",
        },
      },
      { status: 503, headers },
    );
  try {
    return Response.json(await deliverPushReminders(), { headers });
  } catch {
    console.error(JSON.stringify({ event: "push.dispatch.failed" }));
    return Response.json(
      { error: { code: "UNAVAILABLE", message: "Push dispatch failed." } },
      { status: 503, headers },
    );
  }
}
