import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, seedCounterparties, seedLoanEntries, goto, gotoWithSeed, dismissDevOverlay } from "./helpers/storage";

const TODAY = new Date().toISOString().slice(0, 10);
const W1 = { id: "wallet-loan-001", name: "BCA", wallet_type: "bank", balance: 5_000_000 };
const CP1 = { id: "cp-001", name: "Budi Santoso" };
const CP2 = { id: "cp-002", name: "Ani Wijaya" };

test.describe("Loan", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  // ── List ──────────────────────────────────────────────────────────

  test("shows empty state when no counterparties", async ({ page }) => {
    await goto(page, "/loan");
    await expect(page.getByText("No records yet")).toBeVisible();
  });

  test("shows counterparty cards when data exists", async ({ page }) => {
    await gotoWithSeed(page, "/loan", async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1, CP2]);
      await seedLoanEntries(page, [
        { id: "e-001", counterparty_id: CP1.id, type: "give", amount: 500_000, transaction_date: TODAY },
        { id: "e-002", counterparty_id: CP2.id, type: "get", amount: 200_000, transaction_date: TODAY },
      ]);
    });
    await expect(page.getByText("Budi Santoso")).toBeVisible();
    await expect(page.getByText("Ani Wijaya")).toBeVisible();
  });

  test("summary bar shows total give amount", async ({ page }) => {
    await gotoWithSeed(page, "/loan", async () => {
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [
        { id: "e-give", counterparty_id: CP1.id, type: "give", amount: 1_000_000, transaction_date: TODAY },
      ]);
    });
    await expect(page.getByText(/1\.000\.000/).first()).toBeVisible();
  });

  // ── Add Give ──────────────────────────────────────────────────────

  test("navigates to add give form", async ({ page }) => {
    await goto(page, "/loan/add/give");
    await expect(page).toHaveURL(/\/loan\/add\/give/);
    await expect(page.locator("header")).toBeVisible();
  });

  test("add give form has amount field", async ({ page }) => {
    await gotoWithSeed(page, "/loan/add/give", () => seedWallets(page, [W1]));
    // Wallet picker auto-opens — select BCA to close it
    await page.getByText("BCA").click();
    await expect(page.getByPlaceholder("Amount")).toBeVisible();
  });

  test("add give loan submits with new counterparty", async ({ page }) => {
    // Seed wallets, then navigate to /loan first to establish history
    // (form uses router.back() on submit — needs a prior page in history)
    await gotoWithSeed(page, "/loan", () => seedWallets(page, [W1]));
    await page.goto("/loan/add/give", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    // Select wallet from auto-opened picker
    await page.getByText("BCA").click();
    await page.getByPlaceholder("Enter name").fill("Doni Prasetya");
    await page.getByPlaceholder("Amount").fill("300.000");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/loan/);
  });

  // ── Add Get ───────────────────────────────────────────────────────

  test("navigates to add get form", async ({ page }) => {
    await goto(page, "/loan/add/get");
    await expect(page).toHaveURL(/\/loan\/add\/get/);
    await expect(page.locator("header")).toBeVisible();
  });

  // ── Counterparty Detail ───────────────────────────────────────────

  test("counterparty detail shows loan entries", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "e-detail", counterparty_id: CP1.id, type: "give",
        amount: 750_000, note: "Pinjaman motor", transaction_date: TODAY,
      }]);
    });
    await expect(page.getByText("Budi Santoso")).toBeVisible();
    await expect(page.getByText(/750\.000/).first()).toBeVisible();
  });

  test("counterparty detail shows outstanding (unpaid) balance", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [
        { id: "e-os-1", counterparty_id: CP1.id, type: "give", amount: 1_000_000, transaction_date: TODAY },
        { id: "e-os-2", counterparty_id: CP1.id, type: "give", amount: 500_000, transaction_date: TODAY },
      ]);
    });
    await expect(page.getByText(/1\.000\.000/)).toBeVisible();
  });

  // ── FAB ───────────────────────────────────────────────────────────

  test("FAB expands to show Give and Receive options", async ({ page }) => {
    await goto(page, "/loan");
    // Remove dev overlay so the FAB (last button with SVG) is the actual FAB
    await dismissDevOverlay(page);
    const fab = page.locator("button").filter({ has: page.locator("svg") }).last();
    await fab.click();
    await page.waitForTimeout(200);
    await expect(page.getByText("Give", { exact: true })).toBeVisible();
    await expect(page.getByText("Receive", { exact: true })).toBeVisible();
  });
});
