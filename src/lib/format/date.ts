import { format, parseISO, isValid } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";

function dateFnsLocale(locale: string) {
  return locale === "id" ? idLocale : enUS;
}

/**
 * Format a date to display format: "Jum, 01 Mei 2026" (id) / "Fri, 01 May 2026" (en)
 * Accepts ISO 8601 date string (YYYY-MM-DD) or Date object.
 */
export function formatDisplayDate(date: string | Date, locale = "id"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "";
  return format(d, "EEE, dd MMM yyyy", { locale: dateFnsLocale(locale) });
}

/**
 * Format a date range: "01 Mei 2026 - 31 Mei 2026" (id) / "01 May 2026 - 31 May 2026" (en)
 */
export function formatDateRange(from: string | Date, to: string | Date, locale = "id"): string {
  const fromDate = typeof from === "string" ? parseISO(from) : from;
  const toDate = typeof to === "string" ? parseISO(to) : to;
  if (!isValid(fromDate) || !isValid(toDate)) return "";
  return `${format(fromDate, "dd MMM yyyy", { locale: dateFnsLocale(locale) })} - ${format(toDate, "dd MMM yyyy", { locale: dateFnsLocale(locale) })}`;
}

export function formatDisplayDateLocale(date: string | Date, locale: string): string {
  return formatDisplayDate(date, locale);
}

export function formatDateRangeLocale(from: string | Date, to: string | Date, locale: string): string {
  return formatDateRange(from, to, locale);
}

/**
 * Format a month label with locale awareness: "May 2026" (en) / "Mei 2026" (id)
 */
export function formatMonthLabelLocale(date: Date, locale: string): string {
  return format(date, "MMMM yyyy", { locale: dateFnsLocale(locale) });
}

/**
 * Get today as ISO 8601 date string YYYY-MM-DD
 */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Get current time as HH:MM string
 */
export function currentTimeHHMM(): string {
  return format(new Date(), "HH:mm");
}

/**
 * Get ISO 8601 timestamp UTC for created_at / updated_at
 */
export function nowISO(): string {
  return new Date().toISOString();
}
