import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CalendarSchedule, type CalendarEntry } from "./calendar-schedule";
vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);
const entries: CalendarEntry[] = [
  {
    title: { id: "tv-1", slug: "tv-1", title: "Night Shift", poster: "" },
    episode: {
      id: "1",
      name: "The arrival",
      overview: "",
      seasonNumber: 2,
      episodeNumber: 1,
      airDate: "2030-01-02T01:00:00Z",
      rating: 0,
    },
  },
  {
    title: { id: "tv-2", slug: "tv-2", title: "Daylight", poster: "" },
    episode: {
      id: "2",
      name: "Morning",
      overview: "",
      seasonNumber: 1,
      episodeNumber: 2,
      airDate: "2030-02-03",
      rating: 0,
    },
  },
];
it("selects days, navigates months, returns to today and exposes all dates in agenda", () => {
  render(
    <CalendarSchedule
      entries={entries}
      timeZone="America/Los_Angeles"
      today="2030-01-01"
    />,
  );
  const lineup = screen.getByRole("complementary", {
    name: "Selected day episodes",
  });
  expect(
    within(lineup).getByRole("heading", { name: "Night Shift: The arrival" }),
  ).toBeDefined();
  expect(within(lineup).getByText("5:00 PM PST")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByRole("heading", { name: "February 2030" })).toBeDefined();
  fireEvent.click(
    screen.getByRole("button", { name: "Sunday, February 3, 2030, 1 episode" }),
  );
  expect(
    within(lineup).getByRole("heading", { name: "Daylight: Morning" }),
  ).toBeDefined();
  expect(within(lineup).getByText("Time TBA")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(
    within(lineup).getByRole("heading", { name: "Night Shift: The arrival" }),
  ).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  expect(screen.getAllByRole("link")).toHaveLength(2);
});
it("jumps to a future episode and keeps undated episodes reachable", () => {
  render(
    <CalendarSchedule
      entries={[
        {
          ...entries[0],
          episode: { ...entries[0].episode, airDate: undefined },
        },
        entries[1],
      ]}
      timeZone="UTC"
      today="2030-01-01"
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Date to be announced" }),
  ).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Jump to next episode" }));
  expect(screen.getByRole("heading", { name: "February 2030" })).toBeDefined();
  expect(
    screen
      .getByRole("button", { name: "Sunday, February 3, 2030, 1 episode" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
});
