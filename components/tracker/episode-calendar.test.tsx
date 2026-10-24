import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EpisodeCalendar } from "@/components/tracker/episode-calendar";

const tracker = vi.hoisted(() => ({
  data: { watchlistIds: [] as string[], preferences: { timeZone: "UTC" } },
}));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: () => tracker }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  tracker.data.watchlistIds = [];
});
function entry(id: string) {
  return {
    title: {
      id,
      slug: id,
      title: `Title ${id}`,
      poster: "https://example.com/poster.jpg",
    },
    episode: {
      id: "next",
      name: "Next",
      overview: "",
      seasonNumber: 1,
      episodeNumber: 2,
      airDate: "2030-01-01",
      rating: 0,
    },
  };
}
describe("followed episode calendar", () => {
  it("fetches every chunk including Simkl shows beyond the first 25", async () => {
    tracker.data.watchlistIds = [
      ...Array.from({ length: 26 }, (_, i) => `tv-${i + 1}`),
      "simkl-900",
      "movie-1",
    ];
    const fetcher = vi.fn(async (url: string) => {
      const ids = new URL(url, "https://example.com").searchParams
        .get("ids")!
        .split(",");
      return Response.json({
        results: ids.map(entry),
        failedIds: [],
        unresolvedIds: [],
      });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<EpisodeCalendar />);
    await screen.findByRole("button", { name: "Agenda" });
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    await screen.findByRole("heading", { name: "Title simkl-900: Next" });
    expect(
      screen.getByRole("heading", { name: "Title tv-26: Next" }),
    ).toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.every(
        ([url]) =>
          new URL(url, "https://example.com").searchParams
            .get("ids")!
            .split(",").length <= 25,
      ),
    ).toBe(true);
  });
  it("shows unresolved entries honestly instead of announcing that no episodes exist", async () => {
    tracker.data.watchlistIds = ["simkl-900"];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          results: [],
          unresolvedIds: ["simkl-900"],
          failedIds: [],
        }),
      ),
    );
    render(<EpisodeCalendar />);
    await screen.findByRole("alert");
    expect(
      screen.queryByText(/No next episodes have been announced/),
    ).toBeNull();
  });
  it("retains successful chunks and reports a later chunk outage", async () => {
    tracker.data.watchlistIds = Array.from(
      { length: 26 },
      (_, i) => `tv-${i + 1}`,
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            results: [entry("tv-1")],
            failedIds: [],
            unresolvedIds: [],
          }),
        )
        .mockResolvedValueOnce(
          Response.json(
            { error: { message: "Temporarily unavailable" } },
            { status: 502 },
          ),
        ),
    );
    render(<EpisodeCalendar />);
    await waitFor(() =>
      expect(screen.queryByText("Building your calendar…")).toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(
      screen.getByRole("heading", { name: "Title tv-1: Next" }),
    ).toBeDefined();
    expect(screen.getByRole("alert")).toBeDefined();
  });
});
