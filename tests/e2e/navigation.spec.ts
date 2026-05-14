import { test, expect } from "@playwright/test";
import { setupPage, goto } from "./helpers/storage";

test.describe("Navigation & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("root / redirects to /transactions", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Splash screen redirects after ~2s — wait for it
    await page.waitForURL(/\/transactions/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/transactions/);
  });

  test("bottom nav renders 5 tabs", async ({ page }) => {
    await goto(page, "/transactions");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
    await expect(nav.locator("a")).toHaveCount(5);
  });

  test("bottom nav tabs navigate to correct routes", async ({ page }) => {
    await goto(page, "/transactions");

    const routes = [
      { label: "Wallet", url: /\/wallet/ },
      { label: "Loan", url: /\/loan/ },
      { label: "Report", url: /\/report/ },
      { label: "Settings", url: /\/settings/ },
      { label: "Transactions", url: /\/transactions/ },
    ];

    for (const { label, url } of routes) {
      await page.locator("nav").first().locator(`a[aria-label="${label}"]`).click();
      await expect(page).toHaveURL(url);
    }
  });

  test("header is visible at top of every main tab", async ({ page }) => {
    for (const tab of ["/transactions", "/wallet", "/loan", "/report", "/settings"]) {
      await goto(page, tab);
      const header = page.locator("header").first();
      await expect(header).toBeVisible();
      const box = await header.boundingBox();
      expect(box!.y).toBeLessThanOrEqual(10);
    }
  });

  test("no horizontal overflow on main tabs", async ({ page }) => {
    for (const tab of ["/transactions", "/wallet", "/loan", "/report"]) {
      await goto(page, tab);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, `Overflow on ${tab}`).toBe(false);
    }
  });

  test("bottom nav tap targets are at least 44px", async ({ page }) => {
    await goto(page, "/transactions");
    const tabs = page.locator("nav").first().locator("a");
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box!.height, `Tab ${i} too small`).toBeGreaterThanOrEqual(44);
    }
  });
});
