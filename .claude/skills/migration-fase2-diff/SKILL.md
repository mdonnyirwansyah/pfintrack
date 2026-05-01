---
name: migration-fase2-diff
description: Reference for Fase 1 → Fase 2 migration contract. Use when designing types, repos, or before declaring schema work done.
---

# migration-fase2-diff

## The Contract (per global §5.3)

At Fase 2 launch, client POSTs:
```json
POST /api/auth/register
{
  "email": "...", "password": "...",
  "anon_id": "<uuid from localStorage>",
  "payload": {
    "wallets":                [...],
    "wallet_balance_history": [...],
    "transactions":           [...],
    "loan_counterparties":    [...],
    "loan_entries":           [...],
    "custom_reports":         [...]
  }
}
```

Server inserts each array directly to its DB table, only swapping `anon_id` → `user_id`.

## Implication
- localStorage key name = DB table name
- Field name in record = DB column name (use `snake_case`)
- Field type = DB column type (string ↔ TEXT, number ↔ NUMERIC, boolean ↔ BOOLEAN, ISO 8601 string ↔ TIMESTAMP)
- No computed fields stored (compute on the fly)
- No formatted strings stored (only raw numbers/ISO dates)

## Migration-safe Type Pattern
```ts
export interface Wallet {
  id: string;
  anon_id: string;       // becomes user_id at Fase 2
  name: string;
  balance: number;       // raw number, not "Rp 17.000"
  // any module-specific fields...
  is_active: boolean;
  created_at: string;    // ISO 8601
  updated_at: string;    // ISO 8601
}
```

## Diff Check Commands
```bash
# All record-shape interfaces
grep -rn "^export interface" lib/types/

# Find any non-snake_case field
grep -rn ":\s" lib/types/ | grep -E "[a-z][A-Z]"

# Find computed/cached aggregates that shouldn't be stored
grep -rn "total\|computed\|cached" lib/types/
```

## Red Flags
- Storing `wallet.total_balance` instead of computing from entries
- Storing `loan.is_paid_off` if derivable from cumulative entries
- Storing `formatted_amount: string` alongside `amount: number`
- Date fields not in ISO 8601
- Foreign keys named inconsistently (must be `<owner>_id`)
