import { describe, expect, it } from "vitest";
import {
  calendarDay,
  compareCalendarDates,
  monthDays,
  shiftMonth,
} from "./calendar";

describe("calendar dates", () => {
  it("moves exact airtimes across days while preserving date-only announcements", () => {
    expect(calendarDay("2030-01-01T01:00:00Z", "America/Los_Angeles")).toBe(
      "2029-12-31",
    );
    expect(calendarDay("2030-01-01", "America/Los_Angeles")).toBe("2030-01-01");
    expect(calendarDay(undefined, "UTC")).toBeNull();
    expect(calendarDay("invalid", "UTC")).toBeNull();
  });
  it("builds complete Monday-first weeks including leap days and year boundaries", () => {
    const days = monthDays("2028-02");
    expect(days[0]).toBe("2028-01-31");
    expect(days).toContain("2028-02-29");
    expect(days.at(-1)).toBe("2028-03-05");
    expect(days.length % 7).toBe(0);
    expect(shiftMonth("2029-12", 1)).toBe("2030-01");
    expect(shiftMonth("2030-01", -1)).toBe("2029-12");
  });
});

it("orders exact airtimes by instant, then date-only and unknown entries", () => {
  const dates = [
    undefined,
    "2030-01-01",
    "2030-01-01T12:00:00+05:30",
    "2030-01-01T08:00:00Z",
  ];
  expect(dates.sort((a, b) => compareCalendarDates(a, b, "UTC"))).toEqual([
    "2030-01-01T12:00:00+05:30",
    "2030-01-01T08:00:00Z",
    "2030-01-01",
    undefined,
  ]);
});
