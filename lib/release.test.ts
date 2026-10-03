import { describe, expect, it } from "vitest";
import { getReleasePresentation, getTimeLeft } from "@/lib/release";
import { formatReleaseDate } from "@/lib/utils";

describe("release presentation", () => {
  it("does not invent a precise countdown for a date-only release", () => {
    expect(
      getReleasePresentation({
        releaseDate: "2026-09-18",
        releasePrecision: "date",
        now: new Date("2026-09-01T10:00:00Z"),
        timeZone: "Asia/Kolkata",
      }),
    ).toMatchObject({
      kind: "date",
      showCountdown: false,
      label: "Releases Sep 18, 2026",
      timeZoneLabel: "Asia/Calcutta",
    });
  });

  it("shows a timezone-aware countdown for an exact release time", () => {
    expect(
      getReleasePresentation({
        releaseDate: "2026-09-18T20:00:00-07:00",
        releasePrecision: "datetime",
        now: new Date("2026-09-18T00:00:00Z"),
        timeZone: "Asia/Kolkata",
      }),
    ).toMatchObject({
      kind: "countdown",
      showCountdown: true,
      label: "Sep 19, 2026 at 8:30 AM",
      timeZoneLabel: "Asia/Calcutta",
    });
  });

  it("marks past releases as available", () => {
    expect(
      getReleasePresentation({
        releaseDate: "2026-08-01",
        releasePrecision: "date",
        now: new Date("2026-08-29T10:00:00Z"),
        timeZone: "UTC",
      }),
    ).toMatchObject({ kind: "released", showCountdown: false, label: "Released Aug 1, 2026" });
  });
});

describe("countdown", () => {
  it("returns a worked time interval and clamps past dates to zero", () => {
    expect(getTimeLeft("2026-09-03T12:01:01Z", new Date("2026-09-01T10:00:00Z"))).toEqual({
      days: 2,
      hours: 2,
      minutes: 1,
      seconds: 1,
    });
    expect(getTimeLeft("2026-08-01T00:00:00Z", new Date("2026-09-01T00:00:00Z"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe("release date labels", () => {
  it("keeps the calendar day supplied by a date-only source", () => {
    expect(formatReleaseDate("2026-09-18")).toBe("Sep 18, 2026");
  });
});
