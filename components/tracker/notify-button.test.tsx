import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotifyButton } from "@/components/tracker/notify-button";
import { createTrackerData } from "@/lib/tracker";
import type { MediaTitle } from "@/types/media";

const state = vi.hoisted(() => ({
  setReminder: vi.fn(),
  setPreferences: vi.fn(),
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
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("episode reminders", () => {
  it("uses the next episode date rather than the original series premiere", async () => {
    render(<NotifyButton title={title} />);
    fireEvent.click(screen.getByRole("button"));
    expect(state.setReminder).toHaveBeenCalledWith(
      expect.objectContaining({ releaseDate: "2099-03-04" }),
      "tv-42",
    );
  });
  it("disables reminders with an explanation when no future episode date is known", () => {
    render(<NotifyButton title={{ ...title, nextEpisode: undefined }} />);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("title")).toMatch(
      /next episode.*not.*announced/i,
    );
  });
});
