const idFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as IDR currency string.
 * Example: 823110.46 → "823.110,46"
 */
export function formatIDR(amount: number): string {
  return idFormatter.format(amount);
}

/**
 * Format with explicit + prefix for positive values.
 * Example: 5000 → "+ 5.000,00", -17000 → "- 17.000,00"
 */
export function formatIDRSigned(amount: number): string {
  const formatted = idFormatter.format(Math.abs(amount));
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `- ${formatted}`;
  return formatted;
}

/**
 * Parse a formatted IDR string back to a number.
 * Example: "823.110,46" → 823110.46
 */
export function parseIDR(formatted: string): number {
  // Remove thousand separators (dots) and replace decimal comma with dot
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}
