---
description: Run Playwright E2E tests to verify mobile UI. Optionally filter by module.
argument-hint: [module] e.g. wallet, transactions, loan, report, settings (optional)
---

Run the Playwright E2E test suite for mobile UI verification.

If **$ARGUMENTS** is provided, run only that module's spec file:
```bash
npm test tests/e2e/$ARGUMENTS.spec.ts
```

If no argument, run the full suite:
```bash
npm test
```

Report: total passed/failed, and any failure messages.
