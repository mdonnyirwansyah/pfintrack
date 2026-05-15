import { test, expect } from "@playwright/test";

test.describe("PWA — Serwist Turbopack", () => {
  // In dev mode the SW is compiled by esbuild on first request, which can
  // exceed the default 30s timeout on cold start.
  test.setTimeout(120_000);

  test("/serwist/sw.js is served with correct headers", async ({ request }) => {
    const res = await request.get("/serwist/sw.js", { timeout: 90_000 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/javascript");
    expect(res.headers()["service-worker-allowed"]).toBe("/");
  });

  test("/serwist/sw.js body is valid JavaScript with Serwist runtime", async ({ request }) => {
    const res = await request.get("/serwist/sw.js", { timeout: 90_000 });
    const body = await res.text();
    expect(body.length).toBeGreaterThan(100);
    // SW bundle is built by esbuild; should reference `self` (worker global)
    // and contain registration logic.
    expect(body).toMatch(/self/);
  });

  test("legacy /sw.js is a self-unregistering stub", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const body = await res.text();
    // Stub must unregister itself + clear caches so legacy clients migrate cleanly.
    expect(body).toContain("unregister");
    expect(body).toContain("caches");
  });

  test("manifest.webmanifest is reachable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("name");
    expect(json).toHaveProperty("icons");
  });
});
