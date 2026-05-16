#!/usr/bin/env node
/**
 * CLI: generate a backup JSON file with ~5 years of realistic perf-test data.
 *
 * Usage:
 *   npm run seed:perf
 *   npm run seed:perf -- --out custom-name.json
 *   npm run seed:perf -- --anon-id <existing-uuid> --years 3 --seed 42
 *
 * Output is a `BackupData v1` JSON file. Import into the running app via:
 *   Settings → Restore Backup → pick the file.
 *
 * Flags:
 *   --out <path>      Output file path. Default: ./pfintrack-perf-seed.json
 *   --anon-id <uuid>  Anon ID to stamp. Default: generated UUID v4.
 *                     For the import to feel "native" to your current install,
 *                     copy `localStorage.pfintrack_anon_id` from DevTools and
 *                     pass it here. Otherwise the imported records will have a
 *                     different anon_id than your install and won't be visible
 *                     until you also overwrite `pfintrack_anon_id` in storage.
 *   --years <n>       History length in years. Default: 5.
 *   --seed <n>        PRNG seed (integer). Default: 0xc0ffee.
 *   --today <iso>     Override "today" reference (YYYY-MM-DD). Default: actual today.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { generatePerfSeedData } from "../src/lib/perf-seed";

interface Args {
  out: string;
  anonId: string;
  years: number;
  seed: number;
  today?: Date;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    out: "pfintrack-perf-seed.json",
    anonId: randomUUID(),
    years: 5,
    seed: 0xc0ffee,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case "--out":      args.out = next; i++; break;
      case "--anon-id":  args.anonId = next; i++; break;
      case "--years":    args.years = Number.parseInt(next, 10); i++; break;
      case "--seed":     args.seed = Number.parseInt(next, 10); i++; break;
      case "--today":    args.today = new Date(next); i++; break;
      case "--help":
      case "-h":
        console.log(`Usage: npm run seed:perf -- [--out <path>] [--anon-id <uuid>] [--years <n>] [--seed <n>] [--today <YYYY-MM-DD>]`);
        process.exit(0);
        break;
      default:
        if (flag?.startsWith("--")) {
          console.error(`Unknown flag: ${flag}`);
          process.exit(1);
        }
    }
  }
  return args;
}

const args = parseArgs();
const t0 = performance.now();

console.log(`▶ Generating perf-seed data...`);
console.log(`  anon_id: ${args.anonId}`);
console.log(`  years:   ${args.years}`);
console.log(`  seed:    0x${args.seed.toString(16)}`);
if (args.today) console.log(`  today:   ${args.today.toISOString().slice(0, 10)}`);

const result = generatePerfSeedData({
  anonId: args.anonId,
  years: args.years,
  seed: args.seed,
  today: args.today,
});

const outPath = resolve(process.cwd(), args.out);
writeFileSync(outPath, JSON.stringify(result.data));

const elapsedMs = Math.round(performance.now() - t0);
const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(result.data)) / 1024);

console.log(`\n✅ Done in ${elapsedMs} ms — wrote ${sizeKB} KB to:\n   ${outPath}\n`);
console.log(`Counts:`);
console.log(`  wallets:                ${result.counts.wallets}`);
console.log(`  transactions:           ${result.counts.transactions}`);
console.log(`  wallet_balance_history: ${result.counts.walletBalanceHistory}`);
console.log(`  loan_counterparties:    ${result.counts.loanCounterparties}`);
console.log(`  loan_entries:           ${result.counts.loanEntries}`);
console.log(`  custom_reports:         ${result.counts.customReports}`);
console.log(`\nNext step: open the app → Settings → Restore Backup → select the file.`);
console.log(`If you want the data to be visible immediately without changing anon_id,`);
console.log(`re-run with --anon-id <your-current-anon-id> (read from localStorage).`);
