import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Main app routes to pre-cache on install so all modules work offline
// even before the user has visited each page.
const APP_ROUTES = [
  "/transactions",
  "/wallet",
  "/loan",
  "/report",
  "/settings",
];

const HTML_CACHE = "pages-html-cache";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // handled by our NetworkFirst handler below

  runtimeCaching: [
    // ── HTML navigation ────────────────────────────────────────────
    // Try network first (max 3 s), then serve from cache.
    // Pages visited while online are automatically cached here,
    // so they remain accessible on subsequent offline visits.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: HTML_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          }),
        ],
      }),
    },

    // ── Google Fonts ───────────────────────────────────────────────
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "gstatic-fonts-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
  ],

  // Final fallback for navigation requests not found in any cache.
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Warm up the HTML cache for all main routes on install.
// Uses `credentials: "include"` so the locale cookie is forwarded,
// ensuring the correct language is cached from the start.
self.addEventListener("install", (event) => {
  (event as Event & { waitUntil: (p: Promise<unknown>) => void }).waitUntil(
    caches.open(HTML_CACHE).then((cache) =>
      Promise.allSettled(
        APP_ROUTES.map((url) =>
          fetch(url, { credentials: "include" }).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => { /* ignore – no network during install */ })
        )
      )
    )
  );
});
