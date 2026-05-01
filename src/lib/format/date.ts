import { format, parseISO, isValid } from "date-fns";

/**
 * Format a date to display format: "Fri, 01 May 2026"
 * Accepts ISO 8601 date string (YYYY-MM-DD) or Date object.
 */
export function formatDisplayDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "";
  return format(d, "EEE, dd MMM yyyy");
}

/**
 * Format a date range: "01 May 2026 - 31 May 2026"
 */
export function formatDateRange(from: string | Date, to: string | Date): string {
  const fromDate = typeof from === "string" ? parseISO(from) : from;
  const toDate = typeof to === "string" ? parseISO(to) : to;
  if (!isValid(fromDate) || !isValid(toDate)) return "";
  return `${format(fromDate, "dd MMM yyyy")} - ${format(toDate, "dd MMM yyyy")}`;
}

/**
 * Format time string HH:MM to display
 */
export function formatTime(time: string): string {
  return time;
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
