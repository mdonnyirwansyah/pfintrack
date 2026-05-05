import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// All app modules — cached on install so they work offline immediately.
const APP_ROUTES = [
  "/transactions",
  "/wallet",
  "/loan",
  "/report",
  "/settings",
];

const HTML_CACHE = "pages-html-cache";
const RSC_CACHE  = "rsc-payload-cache";

// ── Cache-key plugin: strip RSC / router headers so the URL alone is the key.
// Without this, every client navigation creates a unique cache entry
// (because Next-Router-State-Tree changes each time) and the cache never hits.
const urlOnlyCacheKey = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) =>
    new Request(request.url),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    // ── 1. Full-page navigation (browser tab / refresh) ───────────
    // Network first (3 s timeout), fall back to cached HTML.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: HTML_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },

    // ── 2. RSC payloads (Next.js App Router client-side navigation) ──
    // When the user taps a bottom-nav tab, Next.js fetches an RSC payload
    // (same URL, but with header "RSC: 1") to update only the page content.
    // We cache by URL only (urlOnlyCacheKey) so the same cached payload is
    // served regardless of router-state headers.
    {
      matcher: ({ request }) => request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: RSC_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          urlOnlyCacheKey,
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },

    // ── 3. Next.js prefetch RSC (Link hover / router.prefetch) ───────
    // Same approach as above but for prefetch requests.
    {
      matcher: ({ request }) => request.headers.get("Next-Router-Prefetch") === "1",
      handler: new NetworkFirst({
        cacheName: RSC_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          urlOnlyCacheKey,
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },

    // ── 4. Google Fonts ──────────────────────────────────────────────
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-cache",
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "gstatic-fonts-cache",
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
  ],

  // Last-resort fallback for navigation misses (route never visited offline).
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

// ── Warm-up: pre-cache all modules on SW install ─────────────────────────────
// Fetches both HTML and RSC payload for every route so the user can navigate
// anywhere offline even on first use. `credentials: "include"` forwards the
// locale cookie so the correct language is cached from the start.
self.addEventListener("install", (event) => {
  (event as Event & { waitUntil: (p: Promise<unknown>) => void }).waitUntil(
    Promise.all([
      // HTML responses
      caches.open(HTML_CACHE).then((cache) =>
        Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, { credentials: "include" })
              .then((res) => { if (res.ok) return cache.put(url, res); })
              .catch(() => { /* no network during install — skip silently */ })
          )
        )
      ),
      // RSC payload responses (cache key = URL only)
      caches.open(RSC_CACHE).then((cache) =>
        Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, {
              credentials: "include",
              headers: { RSC: "1", "Next-Router-Prefetch": "1" },
            })
              .then((res) => { if (res.ok) return cache.put(new Request(url), res); })
              .catch(() => { /* skip silently */ })
          )
        )
      ),
    ])
  );
});
