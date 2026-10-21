type Device = { token: string; userId: string };
const deviceKey = "cinecount-push-device-v1";
let operations: Promise<unknown> = Promise.resolve();

/** Serialize snapshots and revocations, including across account remounts. */
export function pushRequest(method: "POST" | "DELETE", body: unknown) {
  const result = operations
    .catch(() => {})
    .then(async () => {
      const response = await fetch("/api/push", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ?? "Could not update background notifications.",
        );
      return data;
    });
  operations = result;
  return result;
}

export function readPushDevice(): Device | null {
  try {
    const saved = JSON.parse(localStorage.getItem(deviceKey) ?? "null");
    return saved &&
      /^[a-f0-9]{64}$/.test(saved.token) &&
      typeof saved.userId === "string"
      ? saved
      : null;
  } catch {
    return null;
  }
}

export function createPushDevice(userId: string): Device {
  const existing = readPushDevice();
  if (existing?.userId === userId) return existing;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const device = { token, userId };
  localStorage.setItem(deviceKey, JSON.stringify(device));
  return device;
}

export async function revokePushDevice(device = readPushDevice()) {
  // Keep the token until the server confirms deletion, so offline revocation retries.
  if (device) {
    await pushRequest("DELETE", { deviceToken: device.token });
    if (readPushDevice()?.token === device.token)
      localStorage.removeItem(deviceKey);
  }
}

export async function pushRegistration() {
  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return navigator.serviceWorker.ready;
}

export function applicationServerKey(value: string) {
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
