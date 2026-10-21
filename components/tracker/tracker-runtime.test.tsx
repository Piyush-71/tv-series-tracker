import { act, cleanup, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackerProvider } from "@/components/tracker/tracker-provider";
import { TrackerRuntime } from "@/components/tracker/tracker-runtime";
import { useTracker } from "@/hooks/use-tracker";
import {
  createTrackerData,
  getTrackerStorageKey,
  trackerThemeStorageKey,
} from "@/lib/tracker";

const auth = vi.hoisted(() => ({
  isLoaded: true,
  userId: "alice" as string | null,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth }));
const notify = vi.fn();
function RuntimeWrapper({ children }: { children: ReactNode }) {
  return (
    <TrackerProvider>
      <TrackerRuntime />
      {children}
    </TrackerProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  auth.isLoaded = true;
  auth.userId = "alice";
  notify.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 21, 12, 30));
  vi.stubGlobal(
    "Notification",
    Object.assign(
      function (...args: unknown[]) {
        notify(...args);
      },
      { permission: "granted" },
    ),
  );
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("tracker reminder runtime", () => {
  it("delivers date-only reminders throughout the target calendar day without inventing an airtime", () => {
    const saved = createTrackerData();
    saved.preferences.browserNotifications = true;
    saved.reminders["tv-42"] = {
      id: "tv-42",
      title: "Example",
      releaseDate: "2026-10-21",
      leadMinutes: 1440,
      createdAt: "2026-10-20T10:00:00Z",
      status: "scheduled",
    };
    localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
    const { result } = renderHook(() => useTracker(), {
      wrapper: RuntimeWrapper,
    });
    expect(notify).toHaveBeenCalledWith(
      "Example is scheduled for 2026-10-21",
      expect.objectContaining({
        body: "Date-only schedule. Exact airtime has not been announced.",
      }),
    );
    expect(result.current.data.reminders["tv-42"].status).toBe("delivered");
    act(() => vi.advanceTimersByTime(60_000));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("reschedules delivered reminders immediately and uses the new account's status updater after a switch", () => {
    const saved = createTrackerData();
    saved.preferences.browserNotifications = true;
    saved.reminders["tv-42"] = {
      id: "tv-42",
      title: "Example",
      releaseDate: "2026-10-21",
      leadMinutes: 1440,
      createdAt: "2026-10-20T10:00:00Z",
      status: "delivered",
    };
    localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
    localStorage.setItem(
      getTrackerStorageKey("bob"),
      JSON.stringify({
        ...saved,
        preferences: { ...saved.preferences, theme: "light" },
      }),
    );
    const { result, rerender } = renderHook(() => useTracker(), {
      wrapper: RuntimeWrapper,
    });
    act(() => result.current.setReleaseOverride("tv-42", "2026-11-01"));
    expect(result.current.data.reminders["tv-42"].status).toBe("scheduled");
    expect(notify).not.toHaveBeenCalled();
    act(() => result.current.setReleaseOverride("tv-42", null));
    expect(result.current.data.reminders["tv-42"].status).toBe("delivered");
    expect(notify).toHaveBeenCalledTimes(1);
    auth.userId = "bob";
    rerender();
    act(() => result.current.setReleaseOverride("tv-42", "2026-10-20"));
    expect(result.current.data.reminders["tv-42"].status).toBe("missed");
    expect(
      JSON.parse(localStorage.getItem(getTrackerStorageKey("alice"))!)
        .reminders["tv-42"].status,
    ).toBe("delivered");
    expect(localStorage.getItem(trackerThemeStorageKey)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("never delivers another account's reminders while auth is loading or after switching", () => {
    const saved = createTrackerData();
    saved.preferences.browserNotifications = true;
    saved.reminders["tv-42"] = {
      id: "tv-42",
      title: "Private title",
      releaseDate: "2026-10-21",
      leadMinutes: 1440,
      createdAt: "2026-10-20T10:00:00Z",
      status: "scheduled",
    };
    localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
    auth.isLoaded = false;
    const { rerender } = renderHook(() => useTracker(), {
      wrapper: RuntimeWrapper,
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(notify).not.toHaveBeenCalled();
    auth.isLoaded = true;
    auth.userId = "bob";
    rerender();
    act(() => vi.advanceTimersByTime(60_000));
    expect(notify).not.toHaveBeenCalled();
    expect(
      JSON.parse(localStorage.getItem(getTrackerStorageKey("alice"))!)
        .reminders["tv-42"].status,
    ).toBe("scheduled");
  });
});
