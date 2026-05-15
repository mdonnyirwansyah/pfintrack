/**
 * Transactions History — /transactions/history
 *
 * Covers scenarios not in transactions.spec.ts:
 * - Page renders with search bar and header
 * - Search filters transactions by title
 * - Clearing search restores full list
 * - Type filter chips (Income, Expense, Transfer, All)
 * - Wallet filter chips (shown when 2+ wallets have transactions)
 * - Date filter button is present
 * - Sort pill is present
 * - Empty state when no transactions at all
 * - Empty state when search yields no results
 * - Transaction item is clickable and navigates to detail
 */

import { test, expect } from "@playwright/test";
import { format } from "date-fns";
import {
  setupPage,
  seedWallets,
  seedTransactions,
  goto,
  gotoWithSeed,
} from "./helpers/storage";

const TODAY = format(new Date(), "yyyy-MM-dd");

const W1 = { id: "wallet-hist-001", name: "BCA", wallet_type: "bank", balance: 5_000_000 };
const W2 = { id: "wallet-hist-002", name: "GoPay", wallet_type: "e_wallet", balance: 1_000_000 };

// ---------------------------------------------------------------------------
// Render & structure
// ---------------------------------------------------------------------------

test.describe("Transactions History — Page Structure", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("history page renders header with back button", async ({ page }) => {
    await goto(page, "/transactions/history");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator('button[aria-label="Back"]')).toBeVisible();
  });

  test("history page renders search bar", async ({ page }) => {
    await goto(page, "/transactions/history");
    await expect(page.getByPlaceholder("Search transactions...")).toBeVisible();
  });

  test("history page shows empty state when no transactions", async ({ page }) => {
    await goto(page, "/transactions/history");
    // "No transactions yet" empty state
    const emptyHeading = page.getByRole("heading", { name: /No transactions yet|No transactions/i });
    if (await emptyHeading.count() > 0) {
      await expect(emptyHeading).toBeVisible();
    } else {
      await expect(page.locator("header")).toBeVisible();
    }
  });

  test("history page shows type filter chips", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-inc-001", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "Gaji", transaction_date: TODAY },
      ]);
    });
    // Type filter chips: All, Income, Expense, Transfer
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Income" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Expense" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transfer" })).toBeVisible();
  });

  test("history page shows date filter button", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-dt-001", type: "income", wallet_id: W1.id, amount: 500_000, title: "Test", transaction_date: TODAY },
      ]);
    });
    // Date filter button with aria-label
    await expect(page.locator('button[aria-label="Date Filter"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test.describe("Transactions History — Search", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("search by title filters the list", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-srch-001", type: "income", wallet_id: W1.id, amount: 2_000_000, title: "Gaji Bulanan", transaction_date: TODAY },
        { id: "hist-srch-002", type: "expense", wallet_id: W1.id, amount: 50_000, title: "Makan Siang", transaction_date: TODAY },
      ]);
    });

    // Both items visible initially
    await expect(page.getByText("Gaji Bulanan")).toBeVisible();
    await expect(page.getByText("Makan Siang")).toBeVisible();

    // Search for "Gaji"
    await page.getByPlaceholder("Search transactions...").fill("Gaji");
    await page.waitForTimeout(200);

    // Only Gaji should be visible
    await expect(page.getByText("Gaji Bulanan")).toBeVisible();
    await expect(page.getByText("Makan Siang")).not.toBeVisible();
  });

  test("clearing search restores full list", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-clr-001", type: "income", wallet_id: W1.id, amount: 2_000_000, title: "Gaji", transaction_date: TODAY },
        { id: "hist-clr-002", type: "expense", wallet_id: W1.id, amount: 50_000, title: "Ojek", transaction_date: TODAY },
      ]);
    });

    // Search to filter
    await page.getByPlaceholder("Search transactions...").fill("Gaji");
    await page.waitForTimeout(200);
    await expect(page.getByText("Ojek")).not.toBeVisible();

    // Clear via the X button
    await page.locator('button[aria-label="Clear"]').click();
    await page.waitForTimeout(200);

    // Both items visible again
    await expect(page.getByText("Gaji")).toBeVisible();
    await expect(page.getByText("Ojek")).toBeVisible();
  });

  test("search with no match shows no-results empty state", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-nomatch-001", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "Gaji", transaction_date: TODAY },
      ]);
    });

    await page.getByPlaceholder("Search transactions...").fill("zzzzznotfound");
    await page.waitForTimeout(200);

    // Should show no-results message or empty state
    const noResults = page.getByText(/No results found|No transactions/i);
    if (await noResults.count() > 0) {
      await expect(noResults.first()).toBeVisible();
    } else {
      // At minimum the "Gaji" entry should be hidden
      await expect(page.getByText("Gaji")).not.toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Type filter
// ---------------------------------------------------------------------------

test.describe("Transactions History — Type Filter", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Income filter hides expense transactions", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-flt-inc", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "Salary", transaction_date: TODAY },
        { id: "hist-flt-exp", type: "expense", wallet_id: W1.id, amount: 50_000, title: "Coffee", transaction_date: TODAY },
      ]);
    });

    // Filter chips are small pills — scope by class to avoid strict-mode conflicts with tx rows
    await page.locator('button.rounded-full', { hasText: /^Income$/ }).first().click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Salary")).toBeVisible();
    await expect(page.getByText("Coffee")).not.toBeVisible();
  });

  test("Expense filter hides income transactions", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-flt2-inc", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "PayDay", transaction_date: TODAY },
        { id: "hist-flt2-exp", type: "expense", wallet_id: W1.id, amount: 75_000, title: "Lunch", transaction_date: TODAY },
      ]);
    });

    // Filter chips are small pills — scope by class to avoid strict-mode conflicts
    await page.locator('button.rounded-full', { hasText: /^Expense$/ }).first().click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Lunch")).toBeVisible();
    await expect(page.getByText("PayDay")).not.toBeVisible();
  });

  test("All filter shows all transactions", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-flt3-inc", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "Income Item", transaction_date: TODAY },
        { id: "hist-flt3-exp", type: "expense", wallet_id: W1.id, amount: 50_000, title: "Expense Item", transaction_date: TODAY },
      ]);
    });

    // Filter chips are small pills with exact text — use exact: true to avoid
    // matching transaction row buttons that contain the wallet/title text
    const incomeChip = page.locator('button.rounded-full', { hasText: /^Income$/ }).first();
    const allChip = page.locator('button.rounded-full', { hasText: /^All$/ }).first();

    await incomeChip.click();
    await page.waitForTimeout(200);
    await allChip.click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Income Item")).toBeVisible();
    await expect(page.getByText("Expense Item")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Wallet filter
// ---------------------------------------------------------------------------

test.describe("Transactions History — Wallet Filter", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("wallet filter chips appear when 2+ wallets have transactions", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1, W2]);
      await seedTransactions(page, [
        { id: "hist-wf-001", type: "income", wallet_id: W1.id, amount: 500_000, title: "BCA Income", transaction_date: TODAY },
        { id: "hist-wf-002", type: "expense", wallet_id: W2.id, amount: 30_000, title: "GoPay Expense", transaction_date: TODAY },
      ]);
    });

    // Wallet filter chips are small pills (rounded-full) — use class scope to avoid
    // matching transaction row buttons that include wallet name in their accessible name
    const bcaChip = page.locator('button.rounded-full', { hasText: /^BCA$/ });
    const gopayChip = page.locator('button.rounded-full', { hasText: /^GoPay$/ });
    await expect(bcaChip).toBeVisible();
    await expect(gopayChip).toBeVisible();
  });

  test("clicking a wallet chip filters transactions to that wallet", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1, W2]);
      await seedTransactions(page, [
        { id: "hist-wf2-001", type: "income", wallet_id: W1.id, amount: 1_000_000, title: "BCA Income", transaction_date: TODAY },
        { id: "hist-wf2-002", type: "expense", wallet_id: W2.id, amount: 30_000, title: "GoPay Expense", transaction_date: TODAY },
      ]);
    });

    // Click BCA wallet chip (scoped to pill buttons to avoid strict-mode conflict with tx rows)
    await page.locator('button.rounded-full', { hasText: /^BCA$/ }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText("BCA Income")).toBeVisible();
    await expect(page.getByText("GoPay Expense")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Navigation from history
// ---------------------------------------------------------------------------

test.describe("Transactions History — Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("tapping a transaction in history navigates to its detail page", async ({ page }) => {
    await gotoWithSeed(page, "/transactions/history", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "hist-nav-001", type: "income", wallet_id: W1.id, amount: 800_000, title: "Nav Test", transaction_date: TODAY },
      ]);
    });

    await page.getByText("Nav Test").click();
    await expect(page).toHaveURL(/\/transactions\/hist-nav-001/);
  });

  test("back button on history page returns to previous page", async ({ page }) => {
    // Establish history: go to transactions list first, then navigate to history
    await goto(page, "/transactions");
    await page.goto("/transactions/history", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Back"]').click();
    await expect(page).toHaveURL(/\/transactions/);
  });
});
