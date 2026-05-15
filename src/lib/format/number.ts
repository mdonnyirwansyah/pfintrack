const idFormatterWithDecimals = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const idFormatterNoDecimals = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Module-level toggle — updated by DecimalFormatSync after store hydration
let _showDecimals = false;

export function setFormatDecimals(v: boolean) {
  _showDecimals = v;
}

function getFormatter() {
  return _showDecimals ? idFormatterWithDecimals : idFormatterNoDecimals;
}

/**
 * Format a number as IDR currency string.
 * Example: 823110.46 → "823.110" (no decimals) or "823.110,46" (with decimals)
 */
export function formatIDR(amount: number): string {
  return getFormatter().format(amount);
}

/**
 * Format with explicit + prefix for positive values.
 * Example: 5000 → "+ 5.000", -17000 → "- 17.000"
 */
export function formatIDRSigned(amount: number): string {
  const formatted = getFormatter().format(Math.abs(amount));
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `- ${formatted}`;
  return formatted;
}

// Dedicated integer formatter for live-typing inputs — independent from the
// _showDecimals toggle so user input is never reformatted with fractions
// while they're still typing the integer part.
const idIntegerFormatter = new Intl.NumberFormat("id-ID", {
  useGrouping: true,
  maximumFractionDigits: 0,
});

/**
 * Format an integer as a dot-grouped id-ID string (e.g. 1234567 → "1.234.567").
 *
 * Replaces the prior `replaceAll(/\B(?=(\d{3})+(?!\d))/g, ".")` regex which
 * SonarQube flagged for super-linear (catastrophic-backtracking) runtime on
 * very long digit strings (ReDoS, javascript:S5852). `Intl.NumberFormat` is
 * a native, linear-time alternative.
 *
 * Returns an empty string for non-finite input so live-typing handlers can
 * safely chain it.
 */
export function formatThousands(value: number): string {
  if (!Number.isFinite(value)) return "";
  return idIntegerFormatter.format(value);
}

/**
 * Parse a formatted IDR string back to a number.
 * Example: "823.110,46" → 823110.46
 */
export function parseIDR(formatted: string): number {
  // Remove thousand separators (dots) and replace decimal comma with dot
  const cleaned = formatted.replaceAll(".", "").replace(",", ".");
  return Number.parseFloat(cleaned);
}
