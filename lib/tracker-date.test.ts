import { describe, expect, it } from "vitest";
import { isTrackerDate, isTrackerTimestamp } from "@/lib/tracker-date";

describe("tracker calendar validation", () => {
  it.each([
    "2024-02-29",
    "2026-10-21",
    "2026-10-21T12:30:00.000Z",
    "2026-10-21T18:00+05:30",
  ])("accepts %s", (value) => {
    expect(isTrackerDate(value)).toBe(true);
    expect(isTrackerTimestamp(value)).toBe(value.includes("T"));
  });
  it.each([
    "",
    "2026-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-10-00",
    "2026-1-1",
    "October 21, 2026",
    "2026-10-21T12:00",
    "2026-10-21T24:00:00Z",
    "2026-10-21T12:60:00Z",
    "2026-10-21T12:00:60Z",
    "2026-10-21T12:00:00+24:00",
    "2026-02-30T12:00:00-05:00",
  ])("rejects %s", (value) => {
    expect(isTrackerDate(value)).toBe(false);
  });
});
