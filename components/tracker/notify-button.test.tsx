import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotifyButton } from "@/components/tracker/notify-button";
import { createTrackerData } from "@/lib/tracker";
import type { MediaTitle } from "@/types/media";

const state = vi.hoisted(() => ({
  setReminder: vi.fn(),
  setPreferences: vi.fn(),
  scheduleReminder: vi.fn(),
  isCurrentScope: vi.fn(() => true),
}));
vi.mock("@/hooks/use-tracker", () => ({
  useTracker: () => ({ data: createTrackerData(), isReady: true, ...state }),
}));
const title = {
  id: "tv-42",
  title: "Returning series",
  type: "tv",
  releaseDate: "2010-01-01",
  nextEpisode: { airDate: "2099-03-04" },
} as MediaTitle;
beforeEach(() => {
  vi.clearAllMocks();
  state.isCurrentScope.mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("episode reminders", () => {
  it("does not describe a premiered series as Date TBA when its next episode is unknown", () => {
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    expect(screen.getByRole("button").textContent).toContain("Check next episode");
    expect(screen.queryByText("Date TBA")).toBeNull();
  });

  it("labels a released movie as released rather than Date TBA", () => {
    render(<NotifyButton title={{ ...title, type: "movie", nextEpisode: undefined }} />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Released");
    expect(button.getAttribute("title")).toMatch(/already been released/i);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Date TBA")).toBeNull();
  });

  it("keeps Date TBA for a movie without a release date", () => {
    render(<NotifyButton title={{ ...title, type: "movie", releaseDate: "", nextEpisode: undefined }} />);
    expect(screen.getByRole("button").textContent).toContain("Date TBA");
    expect(screen.queryByText("Released")).toBeNull();
  });

  it("keeps reminders available for a movie with a future release date", () => {
    render(<NotifyButton title={{ ...title, type: "movie", releaseDate: "2099-03-04", nextEpisode: undefined }} />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Notify Me");
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(state.scheduleReminder).toHaveBeenCalled();
  });

  it("uses the next episode date rather than the original series premiere", async () => {
    render(<NotifyButton title={title} />);
    fireEvent.click(screen.getByRole("button"));
    expect(state.scheduleReminder).toHaveBeenCalledWith(title, false);
  });
  it("checks the schedule on demand when metadata omits the next episode", async () => {
    const episode = {
      id: "next",
      showId: "77",
      tmdbId: "42",
      title: title.title,
      seasonNumber: 2,
      episodeNumber: 1,
      airsAt: "2099-10-24T01:00:00Z",
      precision: "datetime",
      kind: "episode",
    };
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ id: title.id, status: "ready", episode }],
        }),
      });
    vi.stubGlobal("fetch", fetch);
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(state.scheduleReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          nextEpisode: expect.objectContaining({ airDate: episode.airsAt }),
        }),
        false,
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/collection",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [title.id] }),
      }),
    );
  });
  it("explains when neither source has an upcoming episode instead of silently disabling the bell", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            results: [
              {
                id: title.id,
                status: "ready",
                title: { ...title, nextEpisode: undefined },
              },
            ],
          }),
        }),
    );
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      expect.stringMatching(/No upcoming episode date/),
    );
    expect(state.scheduleReminder).not.toHaveBeenCalled();
  });
  it("does not save an old account's reminder after a schedule lookup finishes", async () => {
    let finish!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    fireEvent.click(screen.getByRole("button"));
    state.isCurrentScope.mockReturnValue(false);
    finish({
      ok: true,
      json: async () => ({
        results: [{ id: title.id, status: "ready", title }],
      }),
    });
    await waitFor(() =>
      expect(screen.getByRole("button").getAttribute("aria-busy")).toBe(
        "false",
      ),
    );
    expect(state.scheduleReminder).not.toHaveBeenCalled();
  });
  it("keeps failed schedule checks retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      expect.stringMatching(/try again/i),
    );
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
    expect(state.scheduleReminder).not.toHaveBeenCalled();
  });
});
