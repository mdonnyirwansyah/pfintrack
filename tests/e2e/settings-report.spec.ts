/**
 * Settings Report Visibility — /settings/report
 *
 * Covers scenarios not in report.spec.ts (which only has a basic load test):
 * - Page renders with back button and toggle items
 * - Each visibility toggle has aria-pressed attribute
 * - Toggling a row changes its aria-pressed state
 * - "Show all" / "Hide all" bulk action button is present
 * - Bulk "Hide all" turns all toggles off
 * - Bulk "Show all" turns all toggles on
 */

import { test, expect } from "@playwright/test";
import { setupPage, goto } from "./helpers/storage";

test.describe("Settings Report Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("settings/report page renders header with back button", async ({ page }) => {
    await goto(page, "/settings/report");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator('button[aria-label="Go back"]')).toBeVisible();
  });

  test("page shows multiple toggle rows with aria-pressed", async ({ page }) => {
    await goto(page, "/settings/report");
    const toggles = page.locator('button[aria-pressed]');
    // There are 8 component toggle rows + 1 bulk button (which is not aria-pressed)
    // At minimum we expect several toggles
    await expect(toggles).toHaveCount(8);
  });

  test("Saving Rate Card toggle is present and has aria-pressed", async ({ page }) => {
    await goto(page, "/settings/report");
    const toggle = page.locator('button[aria-pressed]').filter({ hasText: "Saving Rate card" });
    await expect(toggle).toBeVisible();
    const pressed = await toggle.getAttribute("aria-pressed");
    expect(pressed === "true" || pressed === "false").toBe(true);
  });

  test("clicking a toggle changes its aria-pressed state", async ({ page }) => {
    await goto(page, "/settings/report");

    // Use Saving Rate Card toggle
    const toggle = page.locator('button[aria-pressed]').filter({ hasText: "Saving Rate card" });
    const before = await toggle.getAttribute("aria-pressed");

    await toggle.click();
    await page.waitForTimeout(200);

    const after = await toggle.getAttribute("aria-pressed");
    expect(after).not.toEqual(before);
  });

  test("bulk show/hide button is present", async ({ page }) => {
    await goto(page, "/settings/report");
    // Button text is "Show all" or "Hide all" depending on current state
    const bulkBtn = page.getByRole("button", { name: /Show all|Hide all/i });
    await expect(bulkBtn).toBeVisible();
  });

  test("clicking Hide All turns all toggles off", async ({ page }) => {
    await goto(page, "/settings/report");

    // Ensure all are on first by clicking "Show all" if available
    const showAllBtn = page.getByRole("button", { name: "Show all" });
    if (await showAllBtn.count() > 0) {
      await showAllBtn.click();
      await page.waitForTimeout(200);
    }

    // Now "Hide all" should be visible (all are on)
    const hideAllBtn = page.getByRole("button", { name: "Hide all" });
    if (await hideAllBtn.count() > 0) {
      await hideAllBtn.click();
      await page.waitForTimeout(200);

      // All toggles should now be aria-pressed="false"
      const toggles = page.locator('button[aria-pressed]');
      const count = await toggles.count();
      for (let i = 0; i < count; i++) {
        await expect(toggles.nth(i)).toHaveAttribute("aria-pressed", "false");
      }
    } else {
      // If state is already all-off, just verify the bulk button is "Show all"
      await expect(page.getByRole("button", { name: "Show all" })).toBeVisible();
    }
  });

  test("clicking Show All turns all toggles on", async ({ page }) => {
    await goto(page, "/settings/report");

    // First ensure all are off
    const hideAllBtn = page.getByRole("button", { name: "Hide all" });
    if (await hideAllBtn.count() > 0) {
      await hideAllBtn.click();
      await page.waitForTimeout(200);
    }

    // Now click Show All
    const showAllBtn = page.getByRole("button", { name: "Show all" });
    await expect(showAllBtn).toBeVisible();
    await showAllBtn.click();
    await page.waitForTimeout(200);

    // All toggles should now be aria-pressed="true"
    const toggles = page.locator('button[aria-pressed]');
    const count = await toggles.count();
    for (let i = 0; i < count; i++) {
      await expect(toggles.nth(i)).toHaveAttribute("aria-pressed", "true");
    }
  });
});
