import type { Page } from "@playwright/test";

export const TEST_ANON_ID = "test-anon-00000000-0000-0000-0000-000000000001";
const DB_NAME = "pfintrack_db";
const DB_VERSION = 2;

const now = () => new Date().toISOString();

/**
 * Call ONCE per test via page.addInitScript() before any navigation.
 * Sets required localStorage flags so the app starts without the splash
 * redirect or product tour. Does NOT touch IDB (addInitScript runs on
 * every navigation including reloads, so deleting IDB here would wipe
 * seeded data).
 */
export async function setupPage(page: Page) {
  await page.addInitScript(
    ([anonId]) => {
      localStorage.setItem("pfintrack_anon_id", anonId!);
      localStorage.setItem("pfintrack_welcomed", "1");
      localStorage.setItem("tour_completed", new Date().toISOString());
      localStorage.removeItem("pfintrack_demo_mode");
      // Mark migration as done so the app skips the localStorage→IDB migration
      // spinner. Tests seed data directly into IDB, so no migration is needed.
      localStorage.setItem("storage_version", "idb_v1");

      // Use MutationObserver to remove Next.js dev tools elements as they are
      // added to the DOM, preventing them from appearing as the "last button
      // with SVG" and interfering with FAB-targeting E2E selectors.
      const removeDevTools = (node: Element) => {
        if (
          node.hasAttribute("data-nextjs-devtools") ||
          node.hasAttribute("data-issues-collapse") ||
          node.tagName === "NEXTJS-PORTAL" ||
          node.id === "__next-dev-tools-indicator-portal" ||
          node.id === "__next-dev-overlay-portal"
        ) {
          node.remove();
        }
      };
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              removeDevTools(node as Element);
              (node as Element).querySelectorAll("[data-issues-collapse], [data-nextjs-devtools]").forEach(removeDevTools);
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    },
    [TEST_ANON_ID],
  );
}

/** Clears all object stores in pfintrack_db. Call after a goto() so the DB exists. */
export async function clearIDB(page: Page) {
  await page.evaluate(
    async ([dbName, dbVer]) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string, dbVer as number);
        req.onerror = () => resolve(); // DB might not exist yet
        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          if (stores.length === 0) { db.close(); resolve(); return; }
          const tx = db.transaction(stores, "readwrite");
          for (const s of stores) tx.objectStore(s).clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
      });
    },
    [DB_NAME, DB_VERSION] as const,
  );
}

/** Inserts records into an IDB store. Must be called after at least one page.goto(). */
async function idbPut(page: Page, storeName: string, records: object[]) {
  if (records.length === 0) return;
  await page.evaluate(
    async ([dbName, dbVer, store, rows]) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string, dbVer as number);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(store as string)) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(store as string, "readwrite");
          for (const row of rows as object[]) tx.objectStore(store as string).put(row);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
      });
    },
    [DB_NAME, DB_VERSION, storeName, records] as const,
  );
}

export interface SeedWallet {
  id: string;
  name: string;
  wallet_type?: string;
  balance: number;
}

export interface SeedTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  wallet_id: string;
  destination_wallet_id?: string;
  amount: number;
  title?: string;
  category?: string;
  transaction_date: string;
}

export interface SeedCounterparty {
  id: string;
  name: string;
}

export interface SeedLoanEntry {
  id: string;
  counterparty_id: string;
  type: "give" | "get";
  amount: number;
  note?: string;
  transaction_date: string;
}

export async function seedWallets(page: Page, wallets: SeedWallet[]) {
  const ts = now();
  await idbPut(page, "wallets", wallets.map((w, i) => ({
    id: w.id,
    anon_id: TEST_ANON_ID,
    name: w.name,
    wallet_type: w.wallet_type ?? "bank",
    balance: w.balance,
    is_active: true,
    created_at: ts,
    updated_at: ts,
  })));
}

export async function seedTransactions(page: Page, transactions: SeedTransaction[]) {
  const ts = now();
  await idbPut(page, "transactions", transactions.map((t) => ({
    id: t.id,
    anon_id: TEST_ANON_ID,
    type: t.type,
    wallet_id: t.wallet_id,
    destination_wallet_id: t.destination_wallet_id ?? null,
    amount: t.amount,
    title: t.title ?? null,
    category: t.category ?? null,
    description: null,
    transaction_date: t.transaction_date,
    transaction_time: "10:00",
    is_active: true,
    created_at: ts,
    updated_at: ts,
  })));
}

export async function seedCounterparties(page: Page, counterparties: SeedCounterparty[]) {
  const ts = now();
  await idbPut(page, "loan_counterparties", counterparties.map((cp) => ({
    id: cp.id,
    anon_id: TEST_ANON_ID,
    name: cp.name,
    manual_paid_off: false,
    is_active: true,
    created_at: ts,
    updated_at: ts,
  })));
}

export async function seedLoanEntries(page: Page, entries: SeedLoanEntry[]) {
  const ts = now();
  await idbPut(page, "loan_entries", entries.map((e) => ({
    id: e.id,
    anon_id: TEST_ANON_ID,
    counterparty_id: e.counterparty_id,
    type: e.type,
    wallet_id: null,
    amount: e.amount,
    note: e.note ?? null,
    transaction_date: e.transaction_date,
    transaction_time: "10:00",
    is_active: true,
    created_at: ts, updated_at: ts,
  })));
}

/**
 * Navigates to route, clears IDB, seeds data, then reloads so the app reads fresh data.
 * Use this when a test needs pre-seeded data visible on first render.
 */
export async function gotoWithSeed(
  page: Page,
  path: string,
  seed: () => Promise<void>,
) {
  // First nav ensures the app has created the IDB schema
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  // Clear then seed — clearIDB is safe here because addInitScript won't re-run
  // (it only fires before page loads, not after domcontentloaded)
  await clearIDB(page);
  await seed();
  // Reload so React components re-read data from IDB
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}

/** Simple navigation without seeding. */
export async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}
