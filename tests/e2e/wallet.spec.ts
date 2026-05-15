import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, goto, gotoWithSeed } from "./helpers/storage";

const W1 = { id: "wallet-001", name: "BCA Utama", wallet_type: "bank", balance: 5_000_000 };
const W2 = { id: "wallet-002", name: "GoPay", wallet_type: "e_wallet", balance: 500_000 };

test.describe("Wallet", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  // ── List ──────────────────────────────────────────────────────────

  test("shows empty state when no wallets", async ({ page }) => {
    await goto(page, "/wallet");
    await expect(page.getByText("No wallets yet")).toBeVisible();
  });

  test("shows wallet cards with correct names and balances", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1, W2]));
    await expect(page.getByText("BCA Utama")).toBeVisible();
    await expect(page.getByText("GoPay")).toBeVisible();
    await expect(page.getByText(/5\.000\.000/).first()).toBeVisible();
    // GoPay balance — exact: true avoids matching "5.500.000" partial
    await expect(page.getByText("500.000", { exact: true })).toBeVisible();
  });

  test("FAB navigates to add wallet page", async ({ page }) => {
    await goto(page, "/wallet");
    await page.locator('button[aria-label="Add wallet"]').click();
    await expect(page).toHaveURL(/\/wallet\/add/);
  });

  // ── Add ───────────────────────────────────────────────────────────

  test("can add a new wallet and it appears in the list", async ({ page }) => {
    await goto(page, "/wallet/add");
    await page.getByLabel("Wallet Name").fill("Dana");
    await page.getByLabel("Initial Balance").fill("1.000.000");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/wallet$/);
    await expect(page.getByText("Dana")).toBeVisible();
  });

  test("validates required wallet name", async ({ page }) => {
    await goto(page, "/wallet/add");
    await page.locator("button[type='submit']").click();
    // Validation error should appear, page stays
    await expect(page).toHaveURL(/\/wallet\/add/);
  });

  test("rejects duplicate wallet name case-insensitively", async ({ page }) => {
    await gotoWithSeed(page, "/wallet/add", () => seedWallets(page, [W1]));
    await page.getByLabel("Wallet Name").fill("bca utama");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/wallet\/add/);
  });

  // ── Detail / Edit ─────────────────────────────────────────────────

  test("wallet detail page shows name and balance", async ({ page }) => {
    // Seed at /wallet list first, then navigate to detail
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    // Name is in an input — check its value
    await expect(page.getByLabel("Wallet Name")).toHaveValue("BCA Utama");
    await expect(page.getByText(/5\.000\.000/).first()).toBeVisible();
  });

  test("can edit wallet name", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1]));
    await page.goto(`/wallet/${W1.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const nameInput = page.getByLabel("Wallet Name");
    await nameInput.clear();
    await nameInput.fill("BCA Tabungan");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/wallet$/);
    await expect(page.getByText("BCA Tabungan")).toBeVisible();
  });

  test("back button on add page returns to wallet list", async ({ page }) => {
    // Establish history by visiting /wallet first
    await goto(page, "/wallet");
    await page.goto("/wallet/add", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="Back"]').click();
    await expect(page).toHaveURL(/\/wallet$/);
  });

  // ── Total balance summary ─────────────────────────────────────────

  test("shows total balance of all wallets", async ({ page }) => {
    await gotoWithSeed(page, "/wallet", () => seedWallets(page, [W1, W2]));
    // Total = 5.000.000 + 500.000 = 5.500.000
    await expect(page.getByText(/5\.500\.000/)).toBeVisible();
  });
});
