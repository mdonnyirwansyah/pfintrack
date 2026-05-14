/**
 * Wallet — Delete scenarios not covered in wallet.spec.ts.
 *
 * Covers:
 * - Delete wallet button presence on detail page
 * - Delete wallet: confirmation dialog opens
 * - Delete wallet: confirm removes wallet from list (soft delete)
 * - Delete wallet: cancel keeps wallet intact
 * - Wallet with transactions cannot be deleted (shows error)
 */

import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, seedTransactions, goto, gotoWithSeed } from "./helpers/storage";
import { format } from "date-fns";

const TODAY = format(new Date(), "yyyy-MM-dd");
const W1 = { id: "wallet-del-001", name: "BCA Delete Test", wallet_type: "bank", balance: 1_000_000 };
const W2 = { id: "wallet-del-002", name: "GoPay Delete Test", wallet_type: "e_wallet", balance: 500_000 };

test.describe("Wallet — Delete", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("wallet detail page shows delete button", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    const deleteBtn = page.locator('button[aria-label="Delete wallet"]');
    await expect(deleteBtn).toBeVisible();
  });

  test("clicking delete opens confirmation dialog", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Delete wallet"]').click();

    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Delete Wallet?")).toBeVisible();
  });

  test("cancel on delete dialog keeps wallet in list", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Delete wallet"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog closes
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    // Wallet is still in the form
    await expect(page.getByLabel("Wallet Name")).toHaveValue("BCA Delete Test");
  });

  test("confirming delete navigates back to wallet list without the deleted wallet", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1, W2]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Delete wallet"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "Delete" }).click();

    // Should navigate to wallet list
    await expect(page).toHaveURL(/\/wallet$/);
    await page.waitForTimeout(500);

    // Deleted wallet should not be visible
    await expect(page.getByText("BCA Delete Test")).not.toBeVisible();

    // Other wallet should still be present
    await expect(page.getByText("GoPay Delete Test")).toBeVisible();
  });

  test("wallet used in a transaction cannot be deleted — shows toast/error", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-wallet-del", type: "income", wallet_id: W1.id,
        amount: 100_000, title: "Income preventing delete", transaction_date: TODAY,
      }]);
    });

    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Delete wallet"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Delete" }).click();

    await page.waitForTimeout(600);

    // Either a toast error shows up, or the wallet remains accessible
    // The wallet should NOT have been deleted
    const errorToast = page.locator('[data-sonner-toast], .toast, [role="status"]').filter({ hasText: /cannot|use|digunakan/i });
    const walletStillThere = await page.getByText("BCA Delete Test").count();
    const toastShown = await errorToast.count();
    expect(walletStillThere + toastShown).toBeGreaterThan(0);
  });
});
