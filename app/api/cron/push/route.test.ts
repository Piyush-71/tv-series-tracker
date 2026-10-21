import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import {
  deliverPushReminders,
  pushConfigured,
  validCronAuthorization,
} from "@/lib/web-push/server";
vi.mock("@/lib/web-push/server", () => ({
  deliverPushReminders: vi.fn(),
  pushConfigured: vi.fn(),
  validCronAuthorization: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pushConfigured).mockReturnValue(true);
});
it("never dispatches without valid cron credentials", async () => {
  const response = await GET(
    new Request("https://cinecount.test/api/cron/push"),
  );
  expect(response.status).toBe(401);
  expect(deliverPushReminders).not.toHaveBeenCalled();
});
it("dispatches due reminders for the configured scheduler", async () => {
  vi.mocked(validCronAuthorization).mockReturnValue(true);
  vi.mocked(deliverPushReminders).mockResolvedValue({
    accepted: 2,
    expired: 1,
    failed: 0,
  });
  const response = await GET(
    new Request("https://cinecount.test/api/cron/push", {
      headers: { authorization: "Bearer secret" },
    }),
  );
  expect(await response.json()).toEqual({ accepted: 2, expired: 1, failed: 0 });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
