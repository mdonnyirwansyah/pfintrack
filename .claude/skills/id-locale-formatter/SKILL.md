---
name: id-locale-formatter
description: Reference for Indonesian locale (id-ID) number and date formatting rules. Use when adding any UI that displays money or dates.
---

# id-locale-formatter

## Number / Currency

```ts
// /lib/format/number.ts
const fmt = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatIDR(n: number): string {
  return fmt.format(n);  // → "823.110,46"
}

export function formatIDRWithSign(n: number, ctx: 'income' | 'expense' | 'neutral'): string {
  if (ctx === 'income' && n > 0) return `+ ${formatIDR(n)}`;
  if (ctx === 'expense' || n < 0) return `- ${formatIDR(Math.abs(n))}`;
  return formatIDR(n);
}
```

| Input | Output |
|-------|--------|
| `823110.46` | `"823.110,46"` |
| Negative display | `"- 17.000,00"` (note space) |
| Positive display | `"+ 5.000,00"` |

## Dates

```ts
// /lib/format/date.ts

// English short — for read-only display headers
export function formatDateEN(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  // → "Fri, 01 May 2026"
}

// Indonesian short — for form date pickers
export function formatDateID(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  // → "Jum, 01 Mei 2026"
}

// Range display
export function formatDateRangeEN(startIso: string, endIso: string): string {
  return `${formatDateEN(startIso)} - ${formatDateEN(endIso)}`;
}
```

## Storage Format
- Money → plain JS Number (e.g., `823110.46`)
- Date only → `"YYYY-MM-DD"`
- Time only → `"HH:MM"` (24h)
- Datetime → ISO 8601 UTC `"2026-05-01T13:55:00.000Z"`

## Rule
**Never** call `.toFixed`, `.toLocaleString`, or template-format `Rp` outside the formatter module.
