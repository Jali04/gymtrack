/* =============================================
   GYMTRACK — Service Worker
   Handles background rest-timer notifications
   ============================================= */

'use strict';

let _restNotifTimeout = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_REST_NOTIF') {
    clearTimeout(_restNotifTimeout);
    _restNotifTimeout = setTimeout(() => {
      _restNotifTimeout = null;
      self.registration.showNotification('DSCPLN — Pause beendet', {
        body: 'Nächster Satz wartet! Weitermachen. 💪',
        vibrate: [200, 100, 200, 100, 400],
        tag: 'rest-timer',
        renotify: true,
        requireInteraction: false,
        silent: false
      });
    }, data.delayMs);
  }

  if (data.type === 'CANCEL_REST_NOTIF') {
    clearTimeout(_restNotifTimeout);
    _restNotifTimeout = null;
  }
});

// Tapping notification brings app to foreground
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
