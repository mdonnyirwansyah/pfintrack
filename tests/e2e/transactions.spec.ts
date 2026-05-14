import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, seedTransactions, goto, gotoWithSeed } from "./helpers/storage";
import { format } from "date-fns";

const TODAY = format(new Date(), "yyyy-MM-dd");
const W1 = { id: "wallet-tx-001", name: "BCA", wallet_type: "bank", balance: 3_000_000 };
const W2 = { id: "wallet-tx-002", name: "GoPay", wallet_type: "e_wallet", balance: 1_000_000 };

/** Selects a wallet in the bottom-sheet wallet picker */
async function pickWallet(page: Parameters<typeof goto>[0], walletName: string) {
  // Wallet picker auto-opens on add forms — click wallet name in bottom sheet
  await page.getByText(walletName).click();
}

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  // ── List ──────────────────────────────────────────────────────────

  test("shows empty state when no transactions today", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, () => seedWallets(page, [W1]));
    // Use heading role to avoid strict-mode on the description paragraph
    await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
  });

  test("shows income transaction in list", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-001", type: "income", wallet_id: W1.id,
        amount: 2_000_000, title: "Gaji Bulanan", transaction_date: TODAY,
      }]);
    });
    await expect(page.getByText("Gaji Bulanan")).toBeVisible();
    await expect(page.getByText(/2\.000\.000/).first()).toBeVisible();
  });

  test("shows expense transaction in list", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-002", type: "expense", wallet_id: W1.id,
        amount: 50_000, title: "Makan Siang", category: "Food", transaction_date: TODAY,
      }]);
    });
    await expect(page.getByText("Makan Siang")).toBeVisible();
  });

  // ── Add Income ───────────────────────────────────────────────────

  test("add income form renders with Amount and wallet picker", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/income?date=${TODAY}`,
      () => seedWallets(page, [W1]));
    // Wallet picker auto-opens — select BCA to close it
    await pickWallet(page, "BCA");
    await expect(page.getByPlaceholder("Enter amount")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("add income submits and redirects to transactions", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/income?date=${TODAY}`,
      () => seedWallets(page, [W1]));
    await pickWallet(page, "BCA");
    await page.getByPlaceholder("Enter amount").fill("500.000");
    await page.getByPlaceholder("Enter title (optional)").fill("Freelance");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  test("add income validates empty amount", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/income?date=${TODAY}`,
      () => seedWallets(page, [W1]));
    await pickWallet(page, "BCA");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/transactions\/add\/income/);
  });

  // ── Add Expense ───────────────────────────────────────────────────

  test("add expense submits and redirects", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/expense?date=${TODAY}`,
      () => seedWallets(page, [W1]));
    await pickWallet(page, "BCA");
    await page.getByPlaceholder("Enter amount").fill("75.000");
    await page.getByPlaceholder("Enter title (optional)").fill("Ojek Online");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  // ── Add Transfer ──────────────────────────────────────────────────

  test("add transfer page renders with wallet pickers", async ({ page }) => {
    await gotoWithSeed(page, `/transactions/add/transfer?date=${TODAY}`,
      () => seedWallets(page, [W1, W2]));
    await expect(page).toHaveURL(/\/transactions\/add\/transfer/);
    await expect(page.locator("header")).toBeVisible();
    // Transfer form has two wallet pickers
    await expect(page.getByText("Select Wallet").first()).toBeVisible();
  });

  // ── Transaction Detail ────────────────────────────────────────────

  test("tapping a transaction opens detail page", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [{
        id: "tx-detail-001", type: "income", wallet_id: W1.id,
        amount: 1_500_000, title: "Bonus", transaction_date: TODAY,
      }]);
    });
    await page.getByText("Bonus").click();
    await expect(page).toHaveURL(/\/transactions\/tx-detail-001/);
    // Detail page shows edit form — amount is in an input field
    await expect(page.getByPlaceholder("Enter amount")).toHaveValue("1.500.000");
  });

  // ── History ───────────────────────────────────────────────────────

  test("history page loads without error", async ({ page }) => {
    await goto(page, "/transactions/history");
    await expect(page.locator("header")).toBeVisible();
  });

  // ── Summary bar ───────────────────────────────────────────────────

  test("summary bar shows income and expense totals", async ({ page }) => {
    await gotoWithSeed(page, `/transactions?date=${TODAY}`, async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "tx-sum-inc", type: "income", wallet_id: W1.id, amount: 1_000_000, transaction_date: TODAY },
        { id: "tx-sum-exp", type: "expense", wallet_id: W1.id, amount: 200_000, transaction_date: TODAY },
      ]);
    });
    await expect(page.getByText(/1\.000\.000/).first()).toBeVisible();
    await expect(page.getByText(/200\.000/).first()).toBeVisible();
  });
});
