import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const APP_ROUTES = [
  "/transactions",
  "/wallet",
  "/loan",
  "/report",
  "/settings",
];

const HTML_CACHE = "pages-html-cache";
const RSC_CACHE  = "rsc-payload-cache";

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

self.addEventListener("install", (event) => {
  (event as Event & { waitUntil: (p: Promise<unknown>) => void }).waitUntil(
    Promise.all([
      caches.open(HTML_CACHE).then((cache) =>
        Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, { credentials: "include" })
              .then((res) => { if (res.ok) return cache.put(url, res); })
              .catch(() => {})
          )
        )
      ),
      caches.open(RSC_CACHE).then((cache) =>
        Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, {
              credentials: "include",
              headers: { RSC: "1", "Next-Router-Prefetch": "1" },
            })
              .then((res) => { if (res.ok) return cache.put(new Request(url), res); })
              .catch(() => {})
          )
        )
      ),
    ])
  );
});
