import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { GET, PUT } from "./route";
import { createTrackerData } from "@/lib/tracker";
import {
  readAccountTracker,
  writeAccountTracker,
} from "@/lib/account-tracker/server";
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/account-tracker/server", () => ({
  readAccountTracker: vi.fn(),
  writeAccountTracker: vi.fn(),
}));
function request(body: unknown, origin = "https://cinecount.test") {
  return new Request("https://cinecount.test/api/tracker", {
    method: "PUT",
    headers: { origin },
    body: JSON.stringify(body),
  });
}
const input = () => ({
  userId: "alice",
  revision: 0,
  data: createTrackerData(),
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "alice" } as Awaited<
    ReturnType<typeof auth>
  >);
  vi.mocked(readAccountTracker).mockResolvedValue({ data: null, revision: 0 });
  vi.mocked(writeAccountTracker).mockResolvedValue({
    data: createTrackerData(),
    revision: 1,
  });
});
afterEach(() => vi.unstubAllGlobals());
it("reads only the authenticated account with private no-store responses", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(readAccountTracker).toHaveBeenCalledWith("alice");
  expect(await response.json()).toEqual({
    userId: "alice",
    data: null,
    revision: 0,
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
    ReturnType<typeof auth>
  >);
  expect((await GET()).status).toBe(401);
  expect((await PUT(request(input()))).status).toBe(401);
});
it("rejects cross-origin writes, stale sessions and invalid tracker payloads", async () => {
  expect((await PUT(request(input(), "https://evil.test"))).status).toBe(403);
  expect((await PUT(request({ ...input(), userId: "bob" }))).status).toBe(403);
  expect((await PUT(request({ ...input(), revision: -1 }))).status).toBe(400);
  expect((await PUT(request({ ...input(), data: {} }))).status).toBe(400);
  expect(writeAccountTracker).not.toHaveBeenCalled();
});
it("writes with a revision and reports concurrent changes as a conflict", async () => {
  expect((await PUT(request(input()))).status).toBe(200);
  expect(writeAccountTracker).toHaveBeenCalledWith(
    "alice",
    0,
    createTrackerData(),
  );
  vi.mocked(writeAccountTracker).mockResolvedValue(null);
  expect((await PUT(request(input()))).status).toBe(409);
});
it("bounds actual streamed input and does not expose database errors", async () => {
  expect(
    (await PUT(request({ ...input(), padding: "x".repeat(1_000_000) }))).status,
  ).toBe(413);
  const invalid = new Request("https://cinecount.test/api/tracker", {
    method: "PUT",
    headers: { origin: "https://cinecount.test" },
    body: "{",
  });
  expect((await PUT(invalid)).status).toBe(400);
  vi.mocked(writeAccountTracker).mockRejectedValue(
    new Error("postgres://private-credentials"),
  );
  const response = await PUT(request(input()));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("credentials");
  vi.mocked(readAccountTracker).mockRejectedValue(new Error("credentials"));
  expect((await GET()).status).toBe(503);
});
