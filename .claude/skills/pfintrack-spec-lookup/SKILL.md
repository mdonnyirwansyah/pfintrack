---
name: pfintrack-spec-lookup
description: Quickly look up a section of the pfintrack tech-spec without reading whole files. Use when you need a specific design token, route, format rule, or producer-consumer relation.
---

# pfintrack-spec-lookup

Lightweight reference into `tech-spec-docs/`. Avoid reading entire spec files — grep targeted sections.

## How to Use

```bash
# Find a section
grep -n "^## " tech-spec-docs/tech-spec-global-architecture.md

# Get specific section content
sed -n '/^## 4\.3 Palet Warna/,/^## /p' tech-spec-docs/tech-spec-global-architecture.md

# Search across all specs
grep -rn "wallet_balance_history" tech-spec-docs/
```

## Quick Reference Map

| Need | Spec location |
|------|---------------|
| Color palette | global §4.3 |
| Number/date format | global §4.1, §4.2 |
| Route map | global §2.2 |
| Bottom nav tabs | global §3.2 |
| Header variants | global §3.1 |
| FAB rules | global §3.3 |
| Bottom sheet | global §3.4 |
| Confirmation dialog | global §3.6 |
| anon_id | global §5 |
| Producer-Consumer | global §6.2 |
| Wallet balance rules | global §6.3 |
| LocalStorage inventory | global §7 |
| Soft delete | global §8 |
| Open assumptions | global §10 |
| Wallet data shape | module-wallet |
| Transaction data shape | module-transactions |
| Loan data shape | module-loan |
| Report logic | module-report |
