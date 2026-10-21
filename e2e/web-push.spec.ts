import { expect, test } from "@playwright/test";

type PushWorkerScope = {
  registration: ServiceWorkerRegistration;
  clients: { openWindow: (url: string) => Promise<unknown> };
  dispatchEvent: (event: Event) => boolean;
  PushEvent: new (type: string, init: { data: string }) => Event;
  NotificationEvent: new (
    type: string,
    init: { notification: Notification },
  ) => Event;
};

// The legacy headless shell always denies Notification.permission. Use Chromium's
// full headless mode, which supports notifications and permission overrides.
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "chromium" });

test("push worker activates and displays notifications without an open application tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  await context.grantPermissions(["notifications"], { origin });
  expect(await page.evaluate(() => Notification.permission)).toBe("granted");
  const headers = await page.request.get("/sw.js");
  expect(headers.headers()["cache-control"]).toContain("no-store");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  const worker = context
    .serviceWorkers()
    .find((worker) => worker.url().endsWith("/sw.js"));
  expect(worker).toBeDefined();
  const keeper = await context.newPage();
  await keeper.goto("about:blank");
  await page.close();

  // Inject a push event at the browser's real worker boundary; the external push
  // transport is tested separately with the server sender and subscription store.
  await worker!.evaluate(async () => {
    const scope = self as unknown as PushWorkerScope;
    const payload = {
      title: "Example is nearly here",
      body: "Your Cinecount release reminder is due.",
      tag: "cinecount-e2e",
      expiresAt: "2099-01-01T00:00:00Z",
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      await new Promise<void>((resolve, reject) => {
        const event = new scope.PushEvent("push", {
          data: JSON.stringify(payload),
        });
        Object.defineProperty(event, "waitUntil", {
          value: (work: Promise<unknown>) => work.then(() => resolve(), reject),
        });
        scope.dispatchEvent(event);
      });
    }
  });

  const notifications = await worker!.evaluate(async () => {
    const scope = self as unknown as PushWorkerScope;
    const notifications = await scope.registration.getNotifications();
    return notifications.map((notification) => ({
      title: notification.title,
      tag: notification.tag,
      body: notification.body,
      url: notification.data.url,
    }));
  });
  expect(notifications).toEqual([
    {
      title: "Example is nearly here",
      tag: "cinecount-e2e",
      body: "Your Cinecount release reminder is due.",
      url: "/profile#reminders",
    },
  ]);

  const destination = await worker!.evaluate(async () => {
    const scope = self as unknown as PushWorkerScope;
    // Synthetic clicks have no OS user activation. Capture only the browser
    // navigation boundary; a real notification click supplies that activation.
    let opened = "";
    scope.clients.openWindow = async (url) => {
      opened = url;
      return null;
    };
    const [notification] = await scope.registration.getNotifications();
    await new Promise<void>((resolve, reject) => {
      const event = new scope.NotificationEvent("notificationclick", {
        notification,
      });
      Object.defineProperty(event, "waitUntil", {
        value: (work: Promise<unknown>) => work.then(() => resolve(), reject),
      });
      scope.dispatchEvent(event);
    });
    return opened;
  });
  expect(destination).toBe(`${origin}/profile#reminders`);
});
