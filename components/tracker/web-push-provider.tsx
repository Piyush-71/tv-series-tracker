"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";
import { useTracker } from "@/hooks/use-tracker";
import {
  applicationServerKey,
  createPushDevice,
  pushRegistration,
  pushRequest,
  readPushDevice,
  revokePushDevice,
} from "@/lib/web-push/client";

type PushState = {
  mode: "loading" | "local" | "push";
  status: "off" | "syncing" | "connected" | "error";
  message: string;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  retry: () => void;
};
const WebPushContext = createContext<PushState>({
  mode: "local",
  status: "off",
  message:
    "Background notifications are unavailable. Reminders work while Cinecount is open.",
  enable: async () => false,
  disable: async () => {},
  retry: () => {},
});
export function useWebPush() {
  return useContext(WebPushContext);
}

export function WebPushProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const tracker = useTracker();
  const [configuration, setConfiguration] = useState<{
    publicKey: string | null;
    supported: boolean;
    unavailable?: boolean;
  } | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [status, setStatus] = useState<PushState["status"]>("off");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const enabled = tracker.data.preferences.browserNotifications;
  const mode =
    !configuration || !isLoaded
      ? "loading"
      : (configuration.publicKey || configuration.unavailable) &&
          configuration.supported &&
          userId
        ? "push"
        : "local";
  const isCurrentScope = tracker.isCurrentScope;
  const setPreferences = useEffectEvent(tracker.setPreferences);
  const updateReminderStatus = useEffectEvent(tracker.updateReminderStatus);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/push", { signal: AbortSignal.timeout(10_000) })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const config = await response.json();
        if (!cancelled)
          setConfiguration({
            publicKey: config.configured ? config.publicKey : null,
            supported:
              window.isSecureContext &&
              "serviceWorker" in navigator &&
              "PushManager" in window &&
              "Notification" in window,
          });
      })
      .catch(() => {
        if (!cancelled) {
          setConfiguration({
            publicKey: null,
            supported: "serviceWorker" in navigator && "PushManager" in window,
            unavailable: true,
          });
          setStatus("error");
          setMessage(
            "Could not check background notification availability. Reload to try again.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  useEffect(() => {
    if (!isLoaded) return;
    const saved = readPushDevice();
    if (!saved || (saved.userId === userId && enabled)) return;
    let cancelled = false;
    async function revoke() {
      if (!cancelled) setStatus("syncing");
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (cancelled) return;
        await (
          await registration?.pushManager.getSubscription()
        )?.unsubscribe();
        for (const notification of (await registration?.getNotifications()) ??
          [])
          notification.close();
      }
      if (!cancelled) {
        await revokePushDevice(saved);
        if (!cancelled) setStatus("off");
      }
    }
    const retryRevocation = () =>
      void revoke().catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Reconnect and retry to remove the previous subscription.",
          );
        }
      });
    retryRevocation();
    window.addEventListener("online", retryRevocation);
    return () => {
      cancelled = true;
      window.removeEventListener("online", retryRevocation);
    };
  }, [isLoaded, userId, enabled, revision]);

  useEffect(() => {
    if (!isLoaded || !configuration) return;
    let cancelled = false;
    async function restore() {
      if (!enabled) setSubscription(null);
      const saved = readPushDevice();
      const canRestore =
        mode === "push" && enabled && Notification.permission === "granted";
      if (saved && saved.userId !== userId) return;
      if (cancelled || !canRestore || !isCurrentScope()) return;
      const registration = await pushRegistration();
      const restored = await registration.pushManager.getSubscription();
      if (!cancelled && isCurrentScope()) {
        if (restored) setSubscription(restored);
        else {
          setSubscription(null);
          setStatus("off");
          setMessage(
            "Enable background notifications again to reconnect this browser.",
          );
        }
      }
    }
    void restore().catch(() => {
      if (!cancelled)
        setMessage(
          "Could not reconnect notifications. Check your connection and retry.",
        );
    });
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    configuration,
    mode,
    enabled,
    userId,
    isCurrentScope,
    revision,
  ]);

  const snapshot = JSON.stringify({
    reminders: Object.values(tracker.data.reminders),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  useEffect(() => {
    if (mode !== "push" || !enabled || !subscription || !userId) return;
    let cancelled = false;
    async function sync() {
      if (cancelled || !isCurrentScope()) return;
      if (Notification.permission !== "granted") {
        setSubscription(null);
        setPreferences({ browserNotifications: false });
        return;
      }
      setStatus("syncing");
      try {
        const device = createPushDevice(userId!);
        const data = await pushRequest("POST", {
          ...JSON.parse(snapshot),
          deviceToken: device.token,
          userId,
          subscription: subscription!.toJSON(),
        });
        if (cancelled || !isCurrentScope()) return;
        setStatus("connected");
        setMessage(
          "Background notifications are on for this browser, even when Cinecount is closed.",
        );
        for (const reminder of data.reminders) {
          if (reminder.status === "delivered" || reminder.status === "missed")
            updateReminderStatus(reminder.id, reminder.status);
        }
      } catch (error) {
        if (!cancelled && isCurrentScope()) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not sync reminders. Please retry.",
          );
        }
      }
    }
    void sync();
    const interval = window.setInterval(() => void sync(), 60_000);
    const refresh = () => void sync();
    const received = (event: MessageEvent) => {
      if (event.data?.type === "CINECOUNT_PUSH_RECEIVED") void sync();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    navigator.serviceWorker.addEventListener("message", received);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      navigator.serviceWorker.removeEventListener("message", received);
    };
  }, [mode, enabled, subscription, userId, snapshot, isCurrentScope, revision]);

  async function enable() {
    if (mode !== "push" || !userId || !configuration?.publicKey) return false;
    // Ask directly from the user's click; Safari requires a user gesture.
    setStatus("syncing");
    try {
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      if (!isCurrentScope()) return false;
      if (permission !== "granted") {
        setStatus("off");
        setMessage(
          "Notifications are blocked. Allow them in your browser’s site settings, then retry.",
        );
        return false;
      }
      const saved = readPushDevice();
      if (saved && saved.userId !== userId) {
        const old = await navigator.serviceWorker.getRegistration("/");
        await (await old?.pushManager.getSubscription())?.unsubscribe();
        await revokePushDevice(saved);
      }
      const registration = await pushRegistration();
      if (!isCurrentScope()) return false;
      const current = await registration.pushManager.getSubscription();
      const next =
        current ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(configuration.publicKey),
        }));
      if (!isCurrentScope()) {
        await next.unsubscribe();
        return false;
      }
      createPushDevice(userId);
      setSubscription(next);
      tracker.setPreferences({ browserNotifications: true });
      return true;
    } catch (error) {
      if (isCurrentScope()) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not enable notifications. Please retry.",
        );
      }
      return false;
    }
  }

  async function disable() {
    const device = readPushDevice();
    tracker.setPreferences({ browserNotifications: false });
    setSubscription(null);
    setStatus("syncing");
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      await revokePushDevice(device);
      if (isCurrentScope()) {
        setStatus("off");
        setMessage("Background notifications are off for this browser.");
      }
    } catch {
      if (isCurrentScope()) {
        setStatus("error");
        setMessage(
          "Notifications are off locally. Reconnect and retry to remove the saved subscription.",
        );
      }
    }
  }

  const fallback = !userId
    ? "Sign in to enable background notifications. Guest reminders work while Cinecount is open."
    : !configuration?.supported
      ? "This browser cannot receive Web Push. On iPhone or iPad, add Cinecount to your Home Screen, then enable notifications there."
      : "Background notifications are not available yet. Reminders work while Cinecount is open.";
  return (
    <WebPushContext.Provider
      value={{
        mode,
        status: !enabled && status === "connected" ? "off" : status,
        message:
          message ||
          (mode === "local"
            ? fallback
            : "Enable notifications to receive reminders when Cinecount is closed."),
        enable,
        disable,
        retry: () => setRevision((value) => value + 1),
      }}
    >
      {children}
    </WebPushContext.Provider>
  );
}
