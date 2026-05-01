---
name: localstorage-schema-validator
description: Validate that data written to localStorage conforms to the 7-key schema and required record fields. Use when designing or reviewing storage layer changes.
---

# localstorage-schema-validator

## Allowed Keys (exactly 7)
```
anon_id
wallets
wallet_balance_history
transactions
loan_counterparties
loan_entries
custom_reports
```
Any other key written to localStorage is a bug.

## Required Fields per Record (except `anon_id`)
```ts
{
  id: string;          // crypto.randomUUID()
  anon_id: string;     // FK to localStorage['anon_id']
  is_active: boolean;  // soft delete
  created_at: string;  // ISO 8601 datetime
  updated_at: string;  // ISO 8601 datetime
  // ...module-specific fields
}
```

## Validation Snippet (paste into Node)
```js
const REQUIRED = ['id','anon_id','is_active','created_at','updated_at'];
const ALLOWED_KEYS = new Set(['anon_id','wallets','wallet_balance_history','transactions','loan_counterparties','loan_entries','custom_reports']);

for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (!ALLOWED_KEYS.has(key)) console.error('UNEXPECTED KEY:', key);
  if (key === 'anon_id') continue;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.forEach((rec, idx) => {
    REQUIRED.forEach(f => {
      if (!(f in rec)) console.error(`${key}[${idx}] missing ${f}`);
    });
  });
}
```

## Storage Layer Locations
- Repos: `/lib/storage/<key>.ts`
- Helpers: `/lib/storage/base.ts`, `/lib/storage/wallet-balance-ops.ts`
- Bootstrap: `/lib/bootstrap/anon-id.ts`
