---
name: route-coverage-check
description: Verify all 18 routes from spec §2.2 are implemented. Use after module dev or before deploy.
---

# route-coverage-check

## Expected Routes (18)

```
/                                               (redirect → /transactions)
/transactions
/transactions/add/income
/transactions/add/expense
/transactions/add/transfer
/transactions/[id]
/transactions/history
/wallet
/wallet/add
/wallet/[id]
/report
/report/custom/add
/report/custom/[id]/edit
/report/detail
/loan
/loan/[counterpartyId]
/loan/add/give
/loan/add/get
/loan/[counterpartyId]/edit/[entryId]
```

## Check Command

```bash
# List actual routes (Next.js App Router)
find app -name 'page.tsx' -o -name 'route.ts' | sed 's|app||;s|/page.tsx||;s|/route.ts||' | sort

# Or via build output
npx next build 2>&1 | grep -E '^\s*(┌|├|└)' | grep -v '○\|●'
```

## Diff Snippet
```bash
EXPECTED='/
/transactions
/transactions/add/income
/transactions/add/expense
/transactions/add/transfer
/transactions/[id]
/transactions/history
/wallet
/wallet/add
/wallet/[id]
/report
/report/custom/add
/report/custom/[id]/edit
/report/detail
/loan
/loan/[counterpartyId]
/loan/add/give
/loan/add/get
/loan/[counterpartyId]/edit/[entryId]'

ACTUAL=$(find app -name 'page.tsx' | sed 's|app||;s|/page.tsx||' | sort)
diff <(echo "$EXPECTED" | sort) <(echo "$ACTUAL")
```

## Per-route Smoke Test
After build:
```bash
npm run start &
PID=$!
sleep 3
for r in /transactions /wallet /report /loan; do
  curl -s -o /dev/null -w "%{http_code} $r\n" http://localhost:3000$r
done
kill $PID
```
