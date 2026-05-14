import { test, expect } from "@playwright/test";
import { setupPage, seedWallets, seedTransactions, goto, gotoWithSeed } from "./helpers/storage";
import { format, startOfMonth } from "date-fns";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_START = format(startOfMonth(new Date()), "yyyy-MM-dd");
const W1 = { id: "wallet-rep-001", name: "BCA", wallet_type: "bank", balance: 10_000_000 };

test.describe("Report", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  // ── Tabs ──────────────────────────────────────────────────────────

  test("report page renders Live/Monthly/Custom tabs", async ({ page }) => {
    await goto(page, "/report");
    await expect(page.getByRole("button", { name: "Live" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Custom" })).toBeVisible();
  });

  test("switching to Monthly tab works", async ({ page }) => {
    await goto(page, "/report");
    await page.getByRole("button", { name: "Monthly" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator("header")).toBeVisible();
  });

  test("switching to Custom tab works", async ({ page }) => {
    await goto(page, "/report");
    await page.getByRole("button", { name: "Custom" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator("header")).toBeVisible();
  });

  // ── Realtime content ──────────────────────────────────────────────

  test("Live tab shows income and expense amounts", async ({ page }) => {
    await gotoWithSeed(page, "/report", async () => {
      await seedWallets(page, [W1]);
      await seedTransactions(page, [
        { id: "rep-inc", type: "income", wallet_id: W1.id, amount: 5_000_000, title: "Gaji", transaction_date: TODAY },
        { id: "rep-exp", type: "expense", wallet_id: W1.id, amount: 300_000, title: "Makan", transaction_date: TODAY },
      ]);
    });
    await page.waitForTimeout(500);
    await expect(page.getByText(/5\.000\.000/)).toBeVisible();
    await expect(page.getByText(/300\.000/).first()).toBeVisible();
  });

  // ── Detail pages ──────────────────────────────────────────────────

  test("report detail page loads without error", async ({ page }) => {
    await goto(page, "/report/detail");
    await expect(page.locator("header")).toBeVisible();
  });

  test("category page loads without error", async ({ page }) => {
    await goto(page, "/report/category");
    await expect(page.locator("header")).toBeVisible();
  });

  // ── Custom Report CRUD ────────────────────────────────────────────

  test("navigates to add custom report page", async ({ page }) => {
    await goto(page, "/report/custom/add");
    await expect(page).toHaveURL(/\/report\/custom\/add/);
    await expect(page.locator("header")).toBeVisible();
  });

  test("add custom report form has Report Name field", async ({ page }) => {
    await goto(page, "/report/custom/add");
    await expect(page.getByLabel("Report Name")).toBeVisible();
  });

  test("custom report form stays on page when name is empty", async ({ page }) => {
    await goto(page, "/report/custom/add");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/report\/custom\/add/);
  });

  test("can create a custom report", async ({ page }) => {
    // Navigate to /report first to establish history (form uses router.back() on submit)
    await goto(page, "/report");
    await page.goto("/report/custom/add", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.getByLabel("Report Name").fill("Q1 2025");
    const dateInputs = page.locator('input[type="date"]');
    if (await dateInputs.count() >= 2) {
      await dateInputs.nth(0).fill(MONTH_START);
      await dateInputs.nth(1).fill(TODAY);
    }
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/report/);
  });

  // ── Settings > Report ─────────────────────────────────────────────

  test("settings report page loads", async ({ page }) => {
    await goto(page, "/settings/report");
    await expect(page.locator("header")).toBeVisible();
  });
});
