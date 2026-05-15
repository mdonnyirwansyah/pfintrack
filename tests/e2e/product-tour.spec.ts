import { test, expect } from "@playwright/test";
import { setupPage, goto } from "./helpers/storage";

test.describe("Product Tour", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("View Tutorial button is present in Settings and clickable", async ({ page }) => {
    // Smoke test for the resetTour() wiring. The button is the only user-facing
    // entry point to re-trigger the tour once tour_completed is set.
    await goto(page, "/settings");
    const btn = page.getByRole("button", { name: "View Tutorial" });
    await expect(btn).toBeVisible();
    await btn.click();
    // resetTour() navigates to /transactions before activating Joyride.
    await page.waitForURL(/\/transactions/, { timeout: 10_000 });
  });

  test("no Joyride DOM rendered on routes when tour_completed is set", async ({ page }) => {
    // ProductTourLazy returns null when useTourStore.run is false, so no
    // Joyride elements (overlay, spotlight, tooltip, beacon) should appear.
    await page.goto("/transactions", { waitUntil: "networkidle" });
    const joyrideEls = page.locator("[class*='react-joyride'], [data-test-id^='joyride']");
    await expect(joyrideEls).toHaveCount(0);
  });
});
