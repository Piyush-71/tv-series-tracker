import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { getScheduleView } from "@/lib/schedule";

vi.mock("@/lib/schedule", () => ({ getScheduleView: vi.fn() }));
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://cinecount.example/");
  vi.mocked(getScheduleView).mockResolvedValue([
    { showId: "9", slug: "show", airsAt: "2030-01-01T12:00:00Z" },
  ] as Awaited<ReturnType<typeof getScheduleView>>);
});
afterEach(() => vi.unstubAllEnvs());
describe("crawler metadata", () => {
  it.each([
    undefined,
    "not a URL",
    "http://localhost:3000",
    "https://user:pass@cinecount.example",
    "https://cinecount.example/path",
  ])("omits unverified production origins (%s)", async (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
    expect(await sitemap()).toEqual([]);
    expect(robots().sitemap).toBeUndefined();
  });
  it("uses the configured origin consistently and never treats airtime as modification time", async () => {
    const entries = await sitemap();
    expect(
      entries.find((entry) => entry.url.endsWith("/show/9/show")),
    ).toBeDefined();
    expect(
      entries.every(
        (entry) =>
          new URL(entry.url).origin === "https://cinecount.example" &&
          !entry.url.includes("example//"),
      ),
    ).toBe(true);
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(
      true,
    );
    expect(robots().sitemap).toBe("https://cinecount.example/sitemap.xml");
  });
  it("retains static URLs when the schedule source is unavailable", async () => {
    vi.mocked(getScheduleView).mockRejectedValue(new Error("Schedule unavailable"));
    const entries = await sitemap();
    expect(entries).toHaveLength(8);
    expect(entries.some((entry) => entry.url === "https://cinecount.example/explore")).toBe(true);
  });
});
