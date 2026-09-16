// =============================================================================
// Custom Service Worker — Attendance Ledger PWA
// =============================================================================
// Handles:
//   1. Workbox precaching (injected by Vite PWA injectManifest mode)
//   2. Web Push notifications from the server
//   3. Notification click → open/focus the app at the correct route
// =============================================================================

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

// Injected by Vite PWA at build time
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// Push event — show a native OS notification banner
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Attendance Ledger", body: event.data.text() };
  }

  const title   = data.title  || "Attendance Ledger";
  const options = {
    body:    data.body  || data.message || "",
    icon:    data.icon  || "/icon-512.png",
    data:    { link: data.link || "/" },
    vibrate: [200, 100, 200],
    silent:  false,
    renotify: true,
    tag:     data.tag || ("notif_" + Date.now()),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click — focus existing tab or open a new one
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || "/";
  const targetUrl = new URL(rawLink, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        // Focus an existing tab if the app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            await client.focus();
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              link: rawLink,
              url: targetUrl,
              timestamp: Date.now(),
            });
            return client.navigate(targetUrl);
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
