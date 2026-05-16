import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: [
        // Type definitions — no logic to test
        "src/lib/types/**",
        // Zustand stores — covered by E2E
        "src/lib/stores/**",
        // IDB storage repos — covered by E2E, not unit testable without complex mocking
        "src/lib/storage/idb-client.ts",
        "src/lib/storage/wallets-idb.ts",
        "src/lib/storage/wallets.ts",
        "src/lib/storage/transactions-idb.ts",
        "src/lib/storage/transactions.ts",
        "src/lib/storage/wallet-balance-history-idb.ts",
        "src/lib/storage/wallet-balance-history.ts",
        "src/lib/storage/loan-counterparties-idb.ts",
        "src/lib/storage/loan-counterparties.ts",
        "src/lib/storage/loan-entries-idb.ts",
        "src/lib/storage/loan-entries.ts",
        "src/lib/storage/custom-reports-idb.ts",
        "src/lib/storage/custom-reports.ts",
        "src/lib/storage/backup.ts",
        "src/lib/storage/migrate-from-localstorage.ts",
        // Pure re-export shim — logic lives in lib/bootstrap/anon-id.ts (100% covered).
        // V8 coverage provider reports re-export-only modules as 0/0 because the
        // `export { ... } from "..."` form has no executable statements.
        "src/lib/storage/anon-id.ts",
        // Demo data — not business logic
        "src/lib/demo-data.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
