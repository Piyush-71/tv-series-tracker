import { describe, expect, it } from "vitest";
import { formatAirtime } from "@/lib/schedule/format";

describe("schedule airtimes", () => {
  it("shows the same instant on different calendar days across timezones", () => {
    const airtime = "2026-01-02T01:00:00Z";
    expect(formatAirtime(airtime, "America/Los_Angeles")).toBe("Thu, Jan 1, 5:00 PM PST");
    expect(formatAirtime(airtime, "Asia/Kolkata")).toContain("Fri, Jan 2, 6:30 AM");
    expect(formatAirtime(airtime, "Asia/Kathmandu")).toContain("Fri, Jan 2, 6:45 AM");
    expect(formatAirtime(airtime, "UTC")).toBe("Fri, Jan 2, 1:00 AM UTC");
  });

  it("uses the offset at the episode's airtime across daylight saving transitions", () => {
    expect(formatAirtime("2026-03-08T06:30:00Z", "America/New_York")).toContain("1:30 AM EST");
    expect(formatAirtime("2026-03-08T07:30:00Z", "America/New_York")).toContain("3:30 AM EDT");
    expect(formatAirtime("2026-11-01T05:30:00Z", "America/New_York")).toContain("1:30 AM EDT");
    expect(formatAirtime("2026-11-01T06:30:00Z", "America/New_York")).toContain("1:30 AM EST");
  });
});
