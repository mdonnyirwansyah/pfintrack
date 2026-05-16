import { format, parseISO, isValid } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";

function dateFnsLocale(locale: string) {
  return locale === "id" ? idLocale : enUS;
}

export function formatDisplayDate(date: string | Date, locale = "id"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "";
  return format(d, "EEE, dd MMM yyyy", { locale: dateFnsLocale(locale) });
}

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

export function formatMonthLabelLocale(date: Date, locale: string): string {
  return format(date, "MMMM yyyy", { locale: dateFnsLocale(locale) });
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentTimeHHMM(): string {
  return format(new Date(), "HH:mm");
}

export function nowISO(): string {
  return new Date().toISOString();
}
