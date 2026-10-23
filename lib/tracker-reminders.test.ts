import { describe, expect, it } from "vitest";
import {
  createTrackerData,
  importTrackerData,
  type TrackerReminder,
} from "@/lib/tracker";
import {
  getReminderTarget,
  reconcileReleaseOverride,
  reminderTiming,
  withScheduledNextEpisode,
} from "@/lib/tracker-reminders";
import type { MediaTitle } from "@/types/media";
import type { ScheduledEpisode } from "@/types/schedule";

const now = new Date("2026-10-21T12:00:00Z");
const reminder: TrackerReminder = {
  id: "tv-42",
  title: "Example",
  releaseDate: "2026-10-25T20:00:00Z",
  leadMinutes: 1440,
  createdAt: now.toISOString(),
  status: "missed",
};

describe("announced episode schedules", () => {
  const title = {
    id: "tv-42",
    type: "tv",
    releaseDate: "2019-03-29",
  } as MediaTitle;
  const episode: ScheduledEpisode = {
    id: "next",
    showId: "77",
    tmdbId: "42",
    title: "Example",
    slug: "example",
    poster: "/poster.jpg",
    seasonNumber: 2,
    episodeNumber: 1,
    airsAt: "2026-10-24T01:00:00Z",
    precision: "datetime",
    kind: "season-premiere",
    sourceUrl: "https://simkl.com/tv/77",
  };
  it("keeps the series premiere and uses the broadcast schedule as the reminder target", () => {
    const resolved = withScheduledNextEpisode(title, episode, now);
    expect(resolved.releaseDate).toBe("2019-03-29");
    expect(getReminderTarget(resolved, undefined, now)).toBe(episode.airsAt);
  });
  it.each(["2026-10-20T01:00:00Z", "", "invalid"])(
    "does not replace metadata with a past or invalid episode: %s",
    (airsAt) => {
      expect(withScheduledNextEpisode(title, { ...episode, airsAt }, now)).toBe(
        title,
      );
    },
  );
  it("preserves date-only precision instead of fabricating an airtime", () => {
    expect(
      getReminderTarget(
        withScheduledNextEpisode(
          title,
          { ...episode, airsAt: "2026-10-24", precision: "date" },
          now,
        ),
        undefined,
        now,
      ),
    ).toBe("2026-10-24");
  });
  it("does not use another show's schedule", () => {
    expect(
      withScheduledNextEpisode(title, { ...episode, tmdbId: "99" }, now),
    ).toBe(title);
  });
});

describe("reminder targets and reconciliation", () => {
  it.each(["tv", "anime"] as const)(
    "never falls back to a %s series premiere, even when it is future-dated",
    (type) => {
      const title = { type, releaseDate: "2027-01-01" } as MediaTitle;
      expect(getReminderTarget(title, undefined, now)).toBeNull();
      expect(
        getReminderTarget(
          { ...title, nextEpisode: { airDate: "2026-10-20" } } as MediaTitle,
          undefined,
          now,
        ),
      ).toBeNull();
      expect(
        getReminderTarget(
          { ...title, nextEpisode: { airDate: "2026-10-25" } } as MediaTitle,
          undefined,
          now,
        ),
      ).toBe("2026-10-25");
      expect(getReminderTarget(title, "2026-10-26T20:00:00Z", now)).toBe(
        "2026-10-26T20:00:00Z",
      );
    },
  );

  it("accepts movie and event dates without inventing timestamps", () => {
    expect(
      getReminderTarget(
        { type: "movie", releaseDate: "2026-10-25" } as MediaTitle,
        undefined,
        now,
      ),
    ).toBe("2026-10-25");
    expect(
      getReminderTarget(
        { type: "event", releaseDate: "2026-10-25T20:00:00Z" } as MediaTitle,
        undefined,
        now,
      ),
    ).toBe("2026-10-25T20:00:00Z");
    expect(
      getReminderTarget(
        { type: "movie", releaseDate: "" } as MediaTitle,
        undefined,
        now,
      ),
    ).toBeNull();
  });

  it("restores a target through multiple overrides and resets delivered/missed status", () => {
    const saved = createTrackerData();
    saved.reminders[reminder.id] = { ...reminder, status: "delivered" };
    const first = reconcileReleaseOverride(
      saved,
      reminder.id,
      "2026-11-01",
      undefined,
      now,
    );
    const second = reconcileReleaseOverride(
      first,
      reminder.id,
      "2026-12-01",
      undefined,
      now,
    );
    expect(second.reminders[reminder.id]).toMatchObject({
      releaseDate: "2026-12-01",
      originalReleaseDate: reminder.releaseDate,
      status: "scheduled",
    });
    const restored = reconcileReleaseOverride(
      importTrackerData(JSON.stringify(second)),
      reminder.id,
      null,
      undefined,
      now,
    );
    expect(restored.reminders[reminder.id]).toMatchObject({
      releaseDate: reminder.releaseDate,
      status: "scheduled",
    });
    expect(restored.releaseOverrides).toEqual({});
    expect(
      reconcileReleaseOverride(
        restored,
        reminder.id,
        "2026-10-20",
        undefined,
        now,
      ).reminders[reminder.id].status,
    ).toBe("missed");
  });

  it("uses current official metadata for legacy overrides or clears a reminder when the target is unknown", () => {
    const saved = createTrackerData();
    saved.releaseOverrides[reminder.id] = "2026-11-01";
    saved.reminders[reminder.id] = { ...reminder, releaseDate: "2026-11-01" };
    expect(
      reconcileReleaseOverride(saved, reminder.id, null, "2026-12-01", now)
        .reminders[reminder.id],
    ).toMatchObject({ releaseDate: "2026-12-01", status: "scheduled" });
    expect(
      reconcileReleaseOverride(saved, reminder.id, null, undefined, now)
        .reminders,
    ).toEqual({});
    expect(
      reconcileReleaseOverride(saved, reminder.id, "invalid", undefined, now),
    ).toBe(saved);
  });
});

describe("honest reminder timing", () => {
  it("uses the local calendar for date-only reminders", () => {
    // Local noon is deliberately created without a UTC offset.
    const localNow = new Date(2026, 9, 21, 12, 30);
    expect(
      reminderTiming(
        { releaseDate: "2026-10-23", leadMinutes: 1440 },
        localNow,
      ),
    ).toBe("pending");
    expect(
      reminderTiming(
        { releaseDate: "2026-10-22", leadMinutes: 1440 },
        localNow,
      ),
    ).toBe("due");
    expect(
      reminderTiming({ releaseDate: "2026-10-21", leadMinutes: 0 }, localNow),
    ).toBe("due");
    expect(
      reminderTiming(
        { releaseDate: "2026-10-20", leadMinutes: 1440 },
        localNow,
      ),
    ).toBe("missed");
  });
  it("uses exact instants only when an explicit time is available", () => {
    expect(
      reminderTiming({ ...reminder, releaseDate: "2026-10-22T12:00:01Z" }, now),
    ).toBe("pending");
    expect(
      reminderTiming({ ...reminder, releaseDate: "2026-10-22T12:00:00Z" }, now),
    ).toBe("due");
    expect(
      reminderTiming({ ...reminder, releaseDate: "2026-10-21T11:59:59Z" }, now),
    ).toBe("missed");
  });
});

it("does not re-notify an unchanged reminder target", () => {
  const saved = createTrackerData();
  saved.reminders[reminder.id] = { ...reminder, status: "delivered" };
  const next = reconcileReleaseOverride(
    saved,
    reminder.id,
    reminder.releaseDate,
    undefined,
    now,
  );
  expect(next.reminders[reminder.id].status).toBe("delivered");
});
