import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, goto, gotoWithSeed } from "./helpers/storage";

const W1 = { id: "wallet-set-001", name: "BCA", wallet_type: "bank", balance: 1_000_000 };

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("settings page renders with header", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header h1, header h2")).toContainText(/Settings/i);
  });

  test("has Appearance section", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.getByText("Appearance")).toBeVisible();
  });

  test("has Language section", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.getByText("Language")).toBeVisible();
  });

  test("has Data & Storage section", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.getByText("Data & Storage")).toBeVisible();
  });

  test("Export Backup button is visible", async ({ page }) => {
    await gotoWithSeed(page, "/settings", () => seedWallets(page, [W1]));
    await expect(page.getByText("Export Backup")).toBeVisible();
  });

  test("Restore Backup option is visible", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.getByText("Restore Backup")).toBeVisible();
  });

  test("delete all data shows confirmation guard", async ({ page }) => {
    await goto(page, "/settings");
    const deleteBtn = page.getByText(/Delete All|Hapus Semua/i).first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      const hasGuard =
        (await page.locator('dialog[open], [role="dialog"], [role="alertdialog"]').count()) +
        (await page.getByText(/Type the following|confirm/i).count());
      expect(hasGuard).toBeGreaterThan(0);
    }
  });

  test("no horizontal overflow", async ({ page }) => {
    await goto(page, "/settings");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
