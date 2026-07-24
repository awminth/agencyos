/* AgencyOS service worker — local notifications + optional Web Push display */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  let title = 'AgencyOS';
  let body = 'You have a new alert';
  let tag = 'agency-os-push';
  try {
    if (event.data) {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      tag = data.tag || tag;
    }
  } catch {
    try {
      body = event.data ? event.data.text() : body;
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});
