import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mediaTitles } from "@/data/media";
import { createTrackerData } from "@/lib/tracker";
import { ProfileClient } from "./profile-client";

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { firstName: "Viewer" } }) }));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: () => {
  const data = createTrackerData();
  data.recentlyViewed = [{ id: "tv-999", viewedAt: "2026-10-21T00:00:00Z" }];
  data.watchedTitleIds = ["tv-999"]; data.ratings = { "tv-999": 4 };
  return { data, setPreferences: vi.fn() };
} }));
vi.mock("@/components/tracker/timezone-select", () => ({ TimezoneSelect: () => <select aria-label="Timezone" /> }));
vi.mock("@/components/media/media-grid", () => ({ MediaGrid: ({ items }: { items: Array<{ title: string }> }) => <div>{items.map((item) => item.title).join(", ")}</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("loads history and ratings by identity even when absent from discovery", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ id: "tv-999", status: "ready", title: { ...mediaTitles[0], id: "tv-999", title: "Previously watched title" } }] }) }));
  render(<ProfileClient genres={[]} services={[]} />);
  expect(await screen.findAllByText("Previously watched title")).toHaveLength(3);
  expect(screen.getByRole("heading", { name: "Watched history" })).toBeTruthy();
});
