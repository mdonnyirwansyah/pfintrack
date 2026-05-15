import type { Page } from "@playwright/test";

export const TEST_ANON_ID = "test-anon-00000000-0000-0000-0000-000000000001";
const DB_NAME = "pfintrack_db";
const DB_VERSION = 2;

const STORE_NAMES = [
  "wallets",
  "wallet_balance_history",
  "transactions",
  "loan_counterparties",
  "loan_entries",
  "custom_reports",
] as const;

/**
 * Index schema mirroring src/lib/storage/idb-client.ts.
 * MUST stay in sync — if the app declares an index, the test helper
 * must create it too, otherwise repository code that queries by index
 * will throw NotFoundError when the helper pre-creates the DB before
 * the app's own onupgradeneeded fires.
 */
const STORE_INDEXES: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  wallets: [
    ["by_anon_id", "anon_id"],
    ["by_is_active", "is_active"],
  ],
  wallet_balance_history: [
    ["by_anon_id", "anon_id"],
    ["by_wallet_id", "wallet_id"],
    ["by_is_active", "is_active"],
  ],
  transactions: [
    ["by_anon_id", "anon_id"],
    ["by_wallet_id", "wallet_id"],
    ["by_dest_wallet_id", "destination_wallet_id"],
    ["by_date", "transaction_date"],
    ["by_is_active", "is_active"],
  ],
  loan_counterparties: [
    ["by_anon_id", "anon_id"],
    ["by_is_active", "is_active"],
  ],
  loan_entries: [
    ["by_anon_id", "anon_id"],
    ["by_counterparty_id", "counterparty_id"],
    ["by_wallet_id", "wallet_id"],
    ["by_is_active", "is_active"],
  ],
  custom_reports: [
    ["by_anon_id", "anon_id"],
    ["by_is_active", "is_active"],
  ],
};

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

      // Inject a style that disables pointer-events on Next.js dev overlay elements
      // so they never intercept test clicks, regardless of timing.
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, nextjs-portal *, " +
        "[data-nextjs-devtools], [data-nextjs-devtools] *, " +
        "[data-nextjs-dialog-overlay], " +
        "#__next-dev-tools-indicator-portal, #__next-dev-tools-indicator-portal *, " +
        "#__next-dev-overlay-portal, #__next-dev-overlay-portal *, " +
        "[id^='__next-dev'], [id^='__next-dev'] * " +
        "{ pointer-events: none !important; }";
      (document.head || document.documentElement).appendChild(style);

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
              (node as Element)
                .querySelectorAll("[data-issues-collapse], [data-nextjs-devtools]")
                .forEach(removeDevTools);
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    },
    [TEST_ANON_ID],
  );
}

/**
 * Ensures pfintrack_db exists with the correct schema (all 6 object stores).
 * Safe to call before the app has ever navigated to an IDB-using page.
 * If the DB already exists with stores, this is a no-op (clears all records).
 */
export async function clearIDB(page: Page) {
  const storeList = Array.from(STORE_NAMES);
  await page.evaluate(
    async ({ dbName, dbVer, storeNames, indexes }: { dbName: string; dbVer: number; storeNames: string[]; indexes: Record<string, ReadonlyArray<readonly [string, string]>> }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVer);
        req.onerror = () => resolve();

        // Create missing stores + indexes during upgrade (first open or version bump).
        // The index list MUST match src/lib/storage/idb-client.ts — otherwise
        // repository queries via idbGetAllByIndex throw NotFoundError.
        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = (event.target as IDBOpenDBRequest).transaction;
          for (const name of storeNames) {
            let store: IDBObjectStore;
            if (db.objectStoreNames.contains(name)) {
              store = tx!.objectStore(name);
            } else {
              store = db.createObjectStore(name, { keyPath: "id" });
            }
            const wantedIndexes = indexes[name] ?? [];
            for (const [indexName, keyPath] of wantedIndexes) {
              if (!store.indexNames.contains(indexName)) {
                store.createIndex(indexName, keyPath);
              }
            }
          }
        };

        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          if (stores.length === 0) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(stores, "readwrite");
          for (const s of stores) tx.objectStore(s).clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
      });
    },
    { dbName: DB_NAME, dbVer: DB_VERSION, storeNames: storeList, indexes: STORE_INDEXES },
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
  wallet_id?: string | null;
}

export async function seedWallets(page: Page, wallets: SeedWallet[]) {
  const ts = now();
  await idbPut(page, "wallets", wallets.map((w) => ({
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
    wallet_id: e.wallet_id ?? null,
    amount: e.amount,
    note: e.note ?? null,
    transaction_date: e.transaction_date,
    transaction_time: "10:00",
    is_active: true,
    created_at: ts,
    updated_at: ts,
  })));
}

/**
 * Navigates to route, clears IDB (creating schema if needed), seeds data,
 * then reloads so the app reads fresh data.
 * Use this when a test needs pre-seeded data visible on first render.
 */
export async function gotoWithSeed(
  page: Page,
  path: string,
  seed: () => Promise<void>,
) {
  // First nav establishes page context so page.evaluate() works.
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  // clearIDB creates the schema if stores are missing (e.g. when the target
  // page does not itself open IDB on load, such as /settings).
  await clearIDB(page);
  await seed();
  // Reload so React components re-read data from IDB.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}

/** Simple navigation without seeding. */
export async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}

/**
 * Removes Next.js dev overlay elements that can intercept pointer events in tests.
 * Call before clicking elements that might be blocked by the dev indicator badge.
 */
export async function dismissDevOverlay(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(
      "nextjs-portal, [data-nextjs-devtools], #__next-dev-tools-indicator-portal, #__next-dev-overlay-portal"
    ).forEach((el) => el.remove());
  });
}
