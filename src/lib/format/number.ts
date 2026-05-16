const idFormatterWithDecimals = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const idFormatterNoDecimals = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

let _showDecimals = false;

export function setFormatDecimals(v: boolean) {
  _showDecimals = v;
}

function getFormatter() {
  return _showDecimals ? idFormatterWithDecimals : idFormatterNoDecimals;
}

export function formatIDR(amount: number): string {
  return getFormatter().format(amount);
}

export function formatIDRSigned(amount: number): string {
  const formatted = getFormatter().format(Math.abs(amount));
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `- ${formatted}`;
  return formatted;
}

const idIntegerFormatter = new Intl.NumberFormat("id-ID", {
  useGrouping: true,
  maximumFractionDigits: 0,
});

export function formatThousands(value: number): string {
  if (!Number.isFinite(value)) return "";
  return idIntegerFormatter.format(value);
}

export function parseIDR(formatted: string): number {
  const cleaned = formatted.replaceAll(".", "").replace(",", ".");
  return Number.parseFloat(cleaned);
}
