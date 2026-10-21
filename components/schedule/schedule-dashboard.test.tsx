import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ScheduleDashboard } from "@/components/schedule/schedule-dashboard";
import { createScheduleService } from "@/lib/schedule/service";

vi.mock("@/components/schedule/timezone-status", () => ({
  TimezoneStatus: () => null,
}));
vi.mock("@/components/schedule/follow-show-button", () => ({
  FollowShowButton: () => null,
}));
vi.mock("@/components/schedule/schedule-card", () => ({
  ScheduleCard: () => null,
}));
vi.mock("@/components/schedule/schedule-countdown", () => ({
  ScheduleCountdown: () => null,
}));

describe("schedule outage presentation", () => {
  it("shows unavailable and retry instead of empty-announcement copy on source failure", async () => {
    const schedule = createScheduleService({
      list: async () => {
        throw new Error("Source unavailable");
      },
    });
    const dashboard = await schedule.getDashboard(new Date("2026-10-01"));
    expect(dashboard.trending).toEqual([]);
    const html = renderToStaticMarkup(
      <ScheduleDashboard dashboard={dashboard} />,
    );
    expect(html).toMatch(/schedule is temporarily unavailable/i);
    expect(html).toContain("Try again");
    expect(html).not.toContain("No episodes announced");
  });
});
