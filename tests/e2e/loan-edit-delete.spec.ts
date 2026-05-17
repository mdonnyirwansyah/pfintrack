/**
 * Loan — Edit entry, delete entry, mark paid off, and delete counterparty.
 *
 * Covers scenarios not in loan.spec.ts:
 * - Edit a loan entry (navigate to edit page, change amount, save)
 * - Delete a loan entry via edit page
 * - Mark counterparty as paid off
 * - Delete a counterparty
 */

import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, seedCounterparties, seedLoanEntries, gotoWithSeed, dismissDevOverlay } from "./helpers/storage";

const TODAY = new Date().toISOString().slice(0, 10);
const W1 = { id: "wallet-le-001", name: "BCA", wallet_type: "bank", balance: 5_000_000 };
const CP1 = { id: "cp-le-001", name: "Rudi Hartono" };
const CP2 = { id: "cp-le-002", name: "Sari Dewi" };

// ---------------------------------------------------------------------------
// Edit entry
// ---------------------------------------------------------------------------

test.describe("Loan — Edit Entry", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("tapping a loan entry opens edit page", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-edit-001", counterparty_id: CP1.id, type: "give",
        amount: 400_000, note: "Pinjam bensin", transaction_date: TODAY,
      }]);
    });

    // Click on the entry row button to navigate to edit
    await page.locator("button").filter({ hasText: /400\.000/ }).first().click();
    await expect(page).toHaveURL(/\/loan\/.*\/edit\//);
  });

  test("edit page shows existing amount", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}/edit/le-edit-002`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-edit-002", counterparty_id: CP1.id, type: "give",
        amount: 600_000, note: "Pinjam motor", transaction_date: TODAY,
        wallet_id: W1.id,
      }]);
    });

    await expect(page.getByPlaceholder("Amount")).toHaveValue("600.000");
  });

  test("saving edited amount updates the entry in the detail view", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-edit-003", counterparty_id: CP1.id, type: "give",
        amount: 200_000, note: "Pinjam parkir", transaction_date: TODAY,
        wallet_id: W1.id,
      }]);
    });

    await page.locator("button").filter({ hasText: /200\.000/ }).first().click();
    await expect(page).toHaveURL(/\/loan\/.*\/edit\//);

    const amountInput = page.getByPlaceholder("Amount");
    await amountInput.clear();
    await amountInput.fill("250.000");

    await page.locator("button[type='submit']").click();

    // Should navigate back to counterparty detail
    await expect(page).toHaveURL(new RegExp(`/loan/${CP1.id}$`));
    await expect(page.getByText(/250\.000/).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete entry
// ---------------------------------------------------------------------------

test.describe("Loan — Delete Entry", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("edit page shows delete entry button", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}/edit/le-del-001`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-del-001", counterparty_id: CP1.id, type: "give",
        amount: 100_000, note: "Pinjam rokok", transaction_date: TODAY,
        wallet_id: W1.id,
      }]);
    });

    const deleteBtn = page.locator('button[aria-label="Delete"]');
    await expect(deleteBtn).toBeVisible();
  });

  test("clicking delete entry shows confirmation dialog", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}/edit/le-del-002`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-del-002", counterparty_id: CP1.id, type: "give",
        amount: 150_000, transaction_date: TODAY, wallet_id: W1.id,
      }]);
    });

    await dismissDevOverlay(page);
    await page.locator('button[aria-label="Delete"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Delete this entry?")).toBeVisible();
  });

  test("confirming entry delete returns to counterparty detail and entry is gone", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [
        { id: "le-del-003", counterparty_id: CP1.id, type: "give", amount: 350_000, note: "Pinjam helm", transaction_date: TODAY, wallet_id: W1.id },
        { id: "le-del-004", counterparty_id: CP1.id, type: "give", amount: 50_000, note: "Pinjam kunci", transaction_date: TODAY },
      ]);
    });

    // Open edit for first entry
    await page.goto(`/loan/${CP1.id}/edit/le-del-003`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await dismissDevOverlay(page);
    await page.locator('button[aria-label="Delete"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // Navigate back to counterparty detail
    await expect(page).toHaveURL(new RegExp(`/loan/${CP1.id}`));
    await page.waitForTimeout(500);

    // Deleted entry amount should not appear
    await expect(page.getByText(/350\.000/)).not.toBeVisible();

    // The other entry should still be there
    await expect(page.getByText(/50\.000/).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Mark counterparty as paid off
// ---------------------------------------------------------------------------

test.describe("Loan — Mark Paid Off", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Mark as Paid button is visible when there are outstanding entries", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-paid-001", counterparty_id: CP1.id, type: "give",
        amount: 500_000, transaction_date: TODAY,
      }]);
    });

    const markPaidBtn = page.locator('button[aria-label="Mark as Paid Off"]');
    await expect(markPaidBtn).toBeVisible();
  });

  test("confirming mark as paid updates status to Paid Off", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP1.id}`, async () => {
      await seedWallets(page, [W1]);
      await seedCounterparties(page, [CP1]);
      await seedLoanEntries(page, [{
        id: "le-paid-002", counterparty_id: CP1.id, type: "give",
        amount: 500_000, transaction_date: TODAY,
      }]);
    });

    await page.locator('button[aria-label="Mark as Paid Off"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });

    // Confirm mark as paid (scope to dialog so we don't re-click the header trigger)
    await page.getByRole("alertdialog").getByRole("button", { name: "Mark as Paid Off" }).click();
    await page.waitForTimeout(500);

    // Status should show "Paid Off"
    await expect(page.getByText("Paid Off")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete counterparty
// ---------------------------------------------------------------------------

test.describe("Loan — Delete Counterparty", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("delete counterparty button is visible", async ({ page }) => {
    await gotoWithSeed(page, `/loan/${CP2.id}`, async () => {
      await seedCounterparties(page, [CP2]);
    });

    const deleteBtn = page.locator('button[aria-label="Delete"]');
    await expect(deleteBtn).toBeVisible();
  });

  test("confirming delete counterparty removes them from loan list", async ({ page }) => {
    await gotoWithSeed(page, "/loan", async () => {
      await seedCounterparties(page, [CP1, CP2]);
      await seedLoanEntries(page, [
        { id: "le-cp-del-001", counterparty_id: CP2.id, type: "give", amount: 100_000, transaction_date: TODAY },
      ]);
    });

    // Go to CP2 detail
    await page.getByText("Sari Dewi").click();
    await expect(page).toHaveURL(new RegExp(`/loan/${CP2.id}`));

    await dismissDevOverlay(page);
    await page.locator('button[aria-label="Delete"]').click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 3000 });

    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // Should navigate to loan list
    await expect(page).toHaveURL(/\/loan$/);
    await page.waitForTimeout(500);

    // Deleted counterparty should be gone
    await expect(page.getByText("Sari Dewi")).not.toBeVisible();

    // Other counterparty remains
    await expect(page.getByText("Rudi Hartono")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Add Get (Receive) loan entry
// ---------------------------------------------------------------------------

test.describe("Loan — Add Get (Receive)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("add get form has amount field", async ({ page }) => {
    await gotoWithSeed(page, "/loan/add/get", () => seedWallets(page, [W1]));
    // Select wallet from auto-opened picker
    await page.getByText("BCA").click();
    await expect(page.getByPlaceholder("Amount")).toBeVisible();
  });

  test("add get loan submits with new counterparty", async ({ page }) => {
    await gotoWithSeed(page, "/loan", () => seedWallets(page, [W1]));
    await page.goto("/loan/add/get", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    await page.getByText("BCA").click();
    await page.getByPlaceholder("Enter name").fill("Maria Indah");
    await page.getByPlaceholder("Amount").fill("500.000");
    await page.locator("button[type='submit']").click();

    await expect(page).toHaveURL(/\/loan/);
  });
});
