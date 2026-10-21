import { auth } from "@clerk/nextjs/server";
import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST, DELETE } from "./route";
import { pushConfigured } from "@/lib/web-push/server";
import { removePushDevice, syncPushDevice } from "@/lib/web-push/store";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/web-push/server", () => ({ pushConfigured: vi.fn() }));
vi.mock("@/lib/web-push/store", () => ({
  removePushDevice: vi.fn(),
  syncPushDevice: vi.fn(),
}));
const input = () => ({
  deviceToken: "a".repeat(64),
  userId: "alice",
  timeZone: "UTC",
  reminders: [],
  subscription: {
    endpoint: "https://fcm.googleapis.com/example",
    keys: {
      p256dh: Buffer.alloc(65, 4).toString("base64url"),
      auth: Buffer.alloc(16).toString("base64url"),
    },
  },
});
function request(
  body: unknown,
  method = "POST",
  origin = "https://cinecount.test",
) {
  return new Request("https://cinecount.test/api/push", {
    method,
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pushConfigured).mockReturnValue(true);
  vi.mocked(auth).mockResolvedValue({ userId: "alice" } as Awaited<
    ReturnType<typeof auth>
  >);
  vi.mocked(syncPushDevice).mockResolvedValue([]);
});
it("exposes only availability and the public key", async () => {
  vi.stubEnv("VAPID_PUBLIC_KEY", "public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private");
  const response = await GET();
  expect(await response.json()).toEqual({
    configured: true,
    publicKey: "public",
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  vi.unstubAllEnvs();
});
it("saves only authenticated snapshots for the current account", async () => {
  expect((await POST(request(input()))).status).toBe(200);
  expect(syncPushDevice).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "alice" }),
  );
  vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
    ReturnType<typeof auth>
  >);
  expect((await POST(request(input()))).status).toBe(401);
});
it("rejects cross-origin requests and stale account snapshots", async () => {
  expect(
    (await POST(request(input(), "POST", "https://evil.test"))).status,
  ).toBe(403);
  expect((await POST(request({ ...input(), userId: "bob" }))).status).toBe(403);
  expect(syncPushDevice).not.toHaveBeenCalled();
});
it("allows device-token revocation after sign-out without accepting arbitrary device IDs", async () => {
  expect(
    (await DELETE(request({ deviceToken: "a".repeat(64) }, "DELETE"))).status,
  ).toBe(200);
  expect(removePushDevice).toHaveBeenCalledWith("a".repeat(64));
  expect(auth).not.toHaveBeenCalled();
  expect(
    (await DELETE(request({ deviceToken: "guess" }, "DELETE"))).status,
  ).toBe(400);
});
it("bounds streamed input and rejects malformed JSON", async () => {
  expect(
    (await POST(request({ ...input(), padding: "x".repeat(150_000) }))).status,
  ).toBe(413);
  expect(
    (
      await POST(
        new Request("https://cinecount.test/api/push", {
          method: "POST",
          headers: { origin: "https://cinecount.test" },
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);
});
it("returns an actionable error when storage is unavailable", async () => {
  vi.mocked(syncPushDevice).mockRejectedValue(
    new Error("secret connection string"),
  );
  const response = await POST(request(input()));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret connection string");
});
