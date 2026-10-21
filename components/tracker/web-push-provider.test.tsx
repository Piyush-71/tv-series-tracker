import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TrackerProvider } from "./tracker-provider";
import { WebPushProvider, useWebPush } from "./web-push-provider";
import { WebPushSettings } from "./web-push-settings";
import { NotifyButton } from "./notify-button";
import { useTracker } from "@/hooks/use-tracker";
import type { MediaTitle } from "@/types/media";
import { getTrackerStorageKey } from "@/lib/tracker";

const auth = vi.hoisted(() => ({
  isLoaded: true,
  userId: "alice" as string | null,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth }));
const unsubscribe = vi.fn().mockResolvedValue(true);
const subscription = {
  endpoint: "https://fcm.googleapis.com/example",
  unsubscribe,
  toJSON: () => ({
    endpoint: "https://fcm.googleapis.com/example",
    keys: { p256dh: "key", auth: "auth" },
  }),
};
const registration = {
  pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() },
  getNotifications: vi.fn().mockResolvedValue([]),
};
const notification = { permission: "default", requestPermission: vi.fn() };
const title = {
  id: "tv-42",
  title: "Example",
  type: "tv",
  nextEpisode: { airDate: "2099-03-04" },
} as MediaTitle;
const requests: Array<{ method: string; data: Record<string, unknown> }> = [];
const fetchMock = vi.fn();

function Controls() {
  const tracker = useTracker();
  const push = useWebPush();
  return (
    <>
      <WebPushSettings />
      <NotifyButton title={title} />
      <button onClick={() => tracker.setReminder(null, "tv-42")}>
        Remove reminder
      </button>
      <button onClick={() => tracker.reset()}>Reset tracker</button>
      <output>
        {push.mode}:{push.status}
      </output>
    </>
  );
}
function App() {
  return (
    <TrackerProvider>
      <WebPushProvider>
        <Controls />
      </WebPushProvider>
    </TrackerProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  requests.length = 0;
  auth.isLoaded = true;
  auth.userId = "alice";
  notification.permission = "default";
  notification.requestPermission.mockImplementation(async () => {
    notification.permission = "granted";
    return "granted";
  });
  registration.pushManager.getSubscription.mockResolvedValue(null);
  unsubscribe.mockImplementation(async () => {
    registration.pushManager.getSubscription.mockResolvedValue(null);
    return true;
  });
  registration.pushManager.subscribe.mockImplementation(async () => {
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    return subscription;
  });
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("PushManager", function () {});
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("crypto", {
    getRandomValues: (bytes: Uint8Array) => bytes.fill(1),
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  fetchMock.mockImplementation(async (_url, options) => {
    if (!options?.method)
      return Response.json({ configured: true, publicKey: "BA" });
    requests.push({ method: options.method, data: JSON.parse(options.body) });
    return Response.json(
      options.method === "DELETE" ? { success: true } : { reminders: [] },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(async () => {
  cleanup();
  await act(async () => {});
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

it("asks permission only on a click, registers the worker and syncs new and cancelled reminders", async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Remind me about Example" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  expect(notification.requestPermission).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Remind me about Example" }),
  );
  await waitFor(() =>
    expect(
      requests.some(
        (request) =>
          Array.isArray(request.data.reminders) &&
          request.data.reminders.length === 1,
      ),
    ).toBe(true),
  );
  expect(notification.requestPermission).toHaveBeenCalledTimes(1);
  expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  expect(requests.at(-1)?.data.userId).toBe("alice");
  fireEvent.click(screen.getByRole("button", { name: "Remove reminder" }));
  await waitFor(() => expect(requests.at(-1)?.data.reminders).toEqual([]));
});

it("explains denied permission without pretending a reminder is enabled", async () => {
  notification.requestPermission.mockResolvedValue("denied");
  render(<App />);
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enable background notifications" }),
  );
  await screen.findByText(/Notifications are blocked/);
  expect(requests).toEqual([]);
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
});

it("revokes background delivery when the tracker is reset", async () => {
  render(<App />);
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enable background notifications" }),
  );
  await screen.findByText(/Background notifications are on for this browser/);
  fireEvent.click(screen.getByRole("button", { name: "Reset tracker" }));
  await waitFor(() =>
    expect(requests.some((request) => request.method === "DELETE")).toBe(true),
  );
  expect(unsubscribe).toHaveBeenCalled();
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
});

it("surfaces browser permission errors without an unhandled rejection", async () => {
  notification.requestPermission.mockRejectedValue(
    new Error("Browser permission prompt failed"),
  );
  render(<App />);
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enable background notifications" }),
  );
  await screen.findByText("Browser permission prompt failed");
  expect(requests).toEqual([]);
});

it("does not create subscriptions or reminders when an old permission prompt resolves after an account change", async () => {
  let grant!: (permission: string) => void;
  notification.requestPermission.mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const { rerender } = render(<App />);
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Remind me about Example" }),
  );
  auth.userId = "bob";
  rerender(<App />);
  await act(async () => grant("granted"));
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(requests).toEqual([]);
  expect(localStorage.getItem(getTrackerStorageKey("bob"))).toBeNull();
});

it("unsubscribes and revokes the prior account's browser capability after sign-out", async () => {
  localStorage.setItem(
    "cinecount-push-device-v1",
    JSON.stringify({ token: "a".repeat(64), userId: "alice" }),
  );
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  auth.userId = null;
  render(<App />);
  await waitFor(() =>
    expect(requests.some((request) => request.method === "DELETE")).toBe(true),
  );
  expect(unsubscribe).toHaveBeenCalled();
  expect(requests.filter((request) => request.method === "POST")).toEqual([]);
  expect(localStorage.getItem("cinecount-push-device-v1")).toBeNull();
});

it("retries a failed snapshot after the connection returns", async () => {
  let fail = true;
  fetchMock.mockImplementation(async (_url, options) => {
    if (!options?.method)
      return Response.json({ configured: true, publicKey: "BA" });
    return fail
      ? Response.json(
          { error: { message: "Storage temporarily unavailable" } },
          { status: 503 },
        )
      : Response.json({ reminders: [] });
  });
  render(<App />);
  await screen.findByRole("button", {
    name: "Enable background notifications",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enable background notifications" }),
  );
  await screen.findByText("Storage temporarily unavailable");
  fail = false;
  fireEvent(window, new Event("online"));
  await screen.findByText(/Background notifications are on for this browser/);
});
