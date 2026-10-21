/* Push-only worker: no page or authenticated-response caching. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    /* Show a safe fallback. */
  }
  event.waitUntil(
    (async () => {
      // A stable tag replaces an existing notification when a send is retried.
      const tag =
        typeof data?.tag === "string" ? data.tag : "cinecount-reminder";
      const expiry = Date.parse(data?.expiresAt);
      if (Number.isFinite(expiry) && expiry <= Date.now()) return;
      await self.registration.showNotification(
        typeof data?.title === "string" ? data.title : "Cinecount reminder",
        {
          body:
            typeof data?.body === "string"
              ? data.body
              : "Check your upcoming releases.",
          icon: "/favicon.ico",
          tag,
          data: { url: "/profile#reminders" },
        },
      );
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows)
        client.postMessage({ type: "CINECOUNT_PUSH_RECEIVED" });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL("/profile#reminders", self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
