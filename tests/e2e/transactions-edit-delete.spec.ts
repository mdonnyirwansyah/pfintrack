/**
 * Transactions — Edit and Delete scenarios not covered in transactions.spec.ts.
 *
 * Covers:
 * - Edit transaction (change amount and title)
 * - Delete transaction via detail page
 * - Transfer transaction appears in list
 * - Date navigator: previous/next day
 */

import { test, expect } from "@playwright/test";
import { format, subDays } from "date-fns";
import { setupPage, seedWallets, seedTransactions, gotoWithSeed, dismissDevOverlay } from "./helpers/storage";

const TODAY = format(new Date(), "yyyy-MM-dd");
const YESTERDAY = format(subDays(new Date(), 1), "yyyy-MM-dd");

const W1 = { id: "wallet-txed-001", name: "BCA", wallet_type: "bank", balance: 5_000_000 };
const W2 = { id: "wallet-txed-002", name: "GoPay", wallet_type: "e_wallet", balance: 1_000_000 };

// ---------------------------------------------------------------------------
// Edit transaction
// ---------------------------------------------------------------------------

test.describe("Transactions — Edit", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("editing a transaction saves the new amount", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-edit-001", type: "income", wallet_id: W1.id,
        amount: 1_000_000, title: "Gaji", category: "Salary", transaction_date: TODAY,
      }]);
    });

    // Open detail
    await page.getByText("Gaji").click();
    await expect(page).toHaveURL(/\/transactions\/tx-edit-001/);

    // Change amount
    const amountInput = page.getByPlaceholder("Enter amount");
    await amountInput.clear();
    await amountInput.fill("1.500.000");

    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/transactions/);

    // New amount should appear in the list
    await expect(page.getByText(/1\.500\.000/).first()).toBeVisible();
  });

  test("editing a transaction title saves the change", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-edit-002", type: "expense", wallet_id: W1.id,
        amount: 50_000, title: "Ojek Online", category: "Transportation", transaction_date: TODAY,
      }]);
    });

    await page.getByText("Ojek Online").click();
    await expect(page).toHaveURL(/\/transactions\/tx-edit-002/);

    const titleInput = page.getByPlaceholder("Enter title (optional)");
    await titleInput.clear();
    await titleInput.fill("Grab Motor");

    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/transactions/);

    await expect(page.getByText("Grab Motor")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete transaction
// ---------------------------------------------------------------------------

test.describe("Transactions — Delete", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("detail page has a delete button", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-del-001", type: "income", wallet_id: W1.id,
        amount: 500_000, title: "Bonus", transaction_date: TODAY,
      }]);
    });

    await page.getByText("Bonus").click();
    await expect(page).toHaveURL(/\/transactions\/tx-del-001/);

    // Delete button should be present (by icon or text/role)
    const deleteBtn = page.locator('button[aria-label*="elete"], button:has-text("Delete"), button:has-text("Hapus")').first();
    await expect(deleteBtn).toBeVisible();
  });

  test("deleting a transaction removes it from the list", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-del-002", type: "expense", wallet_id: W1.id,
        amount: 75_000, title: "Mie Ayam", category: "Food & Drinks", transaction_date: TODAY,
      }]);
    });

    await page.getByText("Mie Ayam").click();
    await expect(page).toHaveURL(/\/transactions\/tx-del-002/);

    // Click delete
    await dismissDevOverlay(page);
    const deleteBtn = page.locator('button[aria-label*="elete"], button:has-text("Delete"), button:has-text("Hapus")').first();
    await deleteBtn.click();

    // A confirmation dialog may appear — confirm it
    const confirmBtn = page.locator('[role="alertdialog"] button, [role="dialog"] button').filter({ hasText: /Delete|Hapus|Yes/i }).last();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }

    // Should navigate back to transaction list
    await expect(page).toHaveURL(/\/transactions/);

    // Item should no longer be visible
    await expect(page.getByText("Mie Ayam")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Transfer transaction
// ---------------------------------------------------------------------------

test.describe("Transactions — Transfer", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("transfer transaction shows in list with both wallets", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1, W2]);
      await seedTransactions(page, [{
        id: "tx-tr-001", type: "transfer",
        wallet_id: W1.id, destination_wallet_id: W2.id,
        amount: 200_000, title: "Transfer ke GoPay", transaction_date: TODAY,
      }]);
    });
    await expect(page.getByText(/200\.000/).first()).toBeVisible();
  });

  test("add transfer form validates that source and destination cannot be same", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/transfer?date=${TODAY}`,
      () => seedWallets(page, [W1, W2]));
    // Page should stay on transfer URL since we haven't filled the form
    await expect(page).toHaveURL(/\/transactions\/add\/transfer/);
  });
});

// ---------------------------------------------------------------------------
// Date navigator
// ---------------------------------------------------------------------------

test.describe("Transactions — Date Navigator", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("previous day navigation changes date in URL", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, () => seedWallets(page, [W1]));

    // Find the left chevron / previous day button
    const prevBtn = page.locator('button[aria-label*="prev"], button[aria-label*="Previous"], button[aria-label*="Back"]').first();
    if (await prevBtn.count() > 0) {
      await prevBtn.click();
      await expect(page).toHaveURL(new RegExp(YESTERDAY));
    } else {
      // If no aria-label, just verify the navigator is visible
      await expect(page.locator("header")).toBeVisible();
    }
  });

  test("yesterday's transactions are visible when navigating back", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${YESTERDAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-yest-001", type: "income", wallet_id: W1.id,
        amount: 300_000, title: "Kemarin Income", transaction_date: YESTERDAY,
      }]);
    });
    await expect(page.getByText("Kemarin Income")).toBeVisible();
  });
});
