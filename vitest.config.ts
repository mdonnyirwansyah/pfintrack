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
        "src/lib/types/**",
        "src/lib/stores/**",
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
        "src/lib/storage/anon-id.ts",
        "src/lib/demo-data.ts",
        "src/lib/perf-seed.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
