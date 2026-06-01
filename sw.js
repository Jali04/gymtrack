/* =============================================
   GYMTRACK — Service Worker
   Handles background rest-timer notifications
   and offline static assets caching
   ============================================= */

'use strict';

const CACHE_VERSION = 'v4.30';
const CACHE_NAME = `dscpln-static-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/auth.js',
  './js/sync.js',
  './js/db.js',
  './js/i18n.js',
  './js/modals.js',
  './js/nav.js',
  './js/workout.js',
  './js/exercises.js',
  './js/history.js',
  './js/stats.js',
  './js/templates.js',
  './js/calendar.js',
  './js/editWorkout.js',
  './js/timer.js',
  './js/ui.js',
  './js/splash.js',
  './js/progress.js',
  './js/programs.js',
  './js/supplements.js',
  './js/nutrition.js',
  './js/tools.js',
  './js/app.js',
  './js/aiCoach.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=Orbitron:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

let _restNotifTimeout = null;
let _resolveRestNotif = null;

// Install event - caching static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static assets with cache-bypass');
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            const request = new Request(url, { cache: 'reload' });
            return fetch(request)
              .then(response => {
                if (!response.ok) throw new Error(`Request failed for ${url}: status ${response.status}`);
                return cache.put(url, response);
              })
              .catch(err => {
                console.error(`[Service Worker] Failed to cache: ${url}`, err);
              });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleaning up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('dscpln-static-')) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Serve from cache and update in background (Stale While Revalidate)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Do not intercept or cache service worker file itself, browser extensions, non-http URLs, or external APIs (Supabase, Gemini)
  if (
    url.pathname.endsWith('sw.js') || 
    !event.request.url.startsWith('http') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached response, then update in background
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => { /* Ignore offline/network errors */ });
        
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(err => {
        // Fallback for document navigation if completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      });
    })
  );
});

// Message listener for scheduling/cancelling notifications
self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_REST_NOTIF') {
    // Clear any existing notification timeouts/promises
    if (_restNotifTimeout) {
      clearTimeout(_restNotifTimeout);
      _restNotifTimeout = null;
    }
    if (_resolveRestNotif) {
      _resolveRestNotif();
      _resolveRestNotif = null;
    }

    const promise = new Promise((resolve) => {
      _resolveRestNotif = resolve;
      _restNotifTimeout = setTimeout(() => {
        _restNotifTimeout = null;
        _resolveRestNotif = null;
        
        self.registration.showNotification('DSCPLN — Pause beendet', {
          body: 'Nächster Satz wartet! Weitermachen. 💪',
          vibrate: [200, 100, 200, 100, 400],
          tag: 'rest-timer',
          renotify: true,
          requireInteraction: false,
          silent: false
        }).finally(() => {
          resolve();
        });
      }, data.delayMs);
    });

    event.waitUntil(promise);
  }

  if (data.type === 'CANCEL_REST_NOTIF') {
    if (_restNotifTimeout) {
      clearTimeout(_restNotifTimeout);
      _restNotifTimeout = null;
    }
    if (_resolveRestNotif) {
      _resolveRestNotif();
      _resolveRestNotif = null;
    }
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
