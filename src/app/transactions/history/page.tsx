"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, CalendarDays } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortPill, SortKey, applySortKey } from "@/components/shared/SortPill";
import { TransactionItem } from "../_components/TransactionItem";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { Calendar } from "@/components/ui/calendar";
import { FileSearch } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDisplayDate } from "@/lib/format/date";
import type { DateRange } from "react-day-picker";
import { ChevronRight } from "lucide-react";

type FilterType = "all" | "income" | "expense" | "transfer" | "balanceCorrection";

const FILTERS: FilterType[] = ["all", "income", "expense", "transfer", "balanceCorrection"];

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateObj(str: string): Date {
  return new Date(str + "T00:00:00");
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstOfMonth(): Date {
  const d = todayDate();
  d.setDate(1);
  return d;
}

export default function TransactionHistoryPage() {
  const { transactions, isLoading, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const locale = useLocale();

  // Applied date range (null = all time); default 1st of current month to today
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(() => ({
    start: toDateStr(firstOfMonth()),
    end: toDateStr(todayDate()),
  }));

  // Picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [draftFromStr, setDraftFromStr] = useState(""); // YYYY-MM-DD
  const [draftToStr, setDraftToStr] = useState("");     // YYYY-MM-DD
  const [rangeError, setRangeError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(firstOfMonth());

  useEffect(() => {
    loadTransactions();
    void loadWallets();
  }, [loadTransactions, loadWallets]);

  const walletMap = useMemo(
    () => new Map(wallets.map((w) => [w.id, w.name])),
    [wallets]
  );

  const activeWallets = useMemo(() => {
    const ids = new Set(transactions.flatMap((tx) =>
      tx.destination_wallet_id ? [tx.wallet_id, tx.destination_wallet_id] : [tx.wallet_id]
    ));
    return wallets.filter((w) => ids.has(w.id));
  }, [transactions, wallets]);

  const hasFilters =
    activeFilter !== "all" ||
    activeWalletId !== null ||
    searchQuery.trim() !== "" ||
    dateRange !== null;

  const filtered = useMemo(() => {
    let base = transactions;

    if (activeFilter !== "all") {
      base = base.filter((tx) =>
        activeFilter === "balanceCorrection"
          ? tx.category === "Balance Correction"
          : tx.type === activeFilter && tx.category !== "Balance Correction"
      );
    }

    if (dateRange) {
      base = base.filter(
        (tx) => tx.transaction_date >= dateRange.start && tx.transaction_date <= dateRange.end
      );
    }

    if (activeWalletId !== null) {
      base = base.filter(
        (tx) => tx.wallet_id === activeWalletId || tx.destination_wallet_id === activeWalletId
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter((tx) => {
        const walletName = walletMap.get(tx.wallet_id) ?? "";
        const destWalletName = tx.destination_wallet_id
          ? (walletMap.get(tx.destination_wallet_id) ?? "")
          : "";
        return (
          tx.title?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q) ||
          tx.description?.toLowerCase().includes(q) ||
          walletName.toLowerCase().includes(q) ||
          destWalletName.toLowerCase().includes(q)
        );
      });
    }

    return applySortKey(base, sortKey);
  }, [transactions, activeFilter, activeWalletId, searchQuery, walletMap, sortKey, dateRange]);

  function openDatePicker() {
    setDraftFromStr(dateRange?.start ?? "");
    setDraftToStr(dateRange?.end ?? "");
    setActiveField("from");
    setRangeError("");
    setCalendarMonth(dateRange ? toDateObj(dateRange.start) : firstOfMonth());
    setIsDatePickerOpen(true);
  }

  function handleFromInput(val: string) {
    setDraftFromStr(val);
    setActiveField("from");
    if (val && draftToStr && val > draftToStr) {
      setRangeError(t("history.errorStartAfterEnd"));
    } else {
      setRangeError("");
    }
    if (val) setCalendarMonth(toDateObj(val));
  }

  function handleToInput(val: string) {
    setDraftToStr(val);
    setActiveField("to");
    if (draftFromStr && val && draftFromStr > val) {
      setRangeError(t("history.errorStartAfterEnd"));
    } else {
      setRangeError("");
    }
    if (val) setCalendarMonth(toDateObj(val));
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    const newFrom = range?.from ? toDateStr(range.from) : "";
    const newTo = range?.to ? toDateStr(range.to) : "";
    setDraftFromStr(newFrom);
    setDraftToStr(newTo);
    setRangeError("");
    if (newFrom && !newTo) setActiveField("to");
    else if (!newFrom) setActiveField("from");
  }

  function applyDraftRange() {
    if (!draftFromStr) return;
    const end = draftToStr || draftFromStr;
    setDateRange({ start: draftFromStr, end });
    setIsDatePickerOpen(false);
  }

  function clearDateRange() {
    setDateRange(null);
    setIsDatePickerOpen(false);
  }

  const draftFromDate = draftFromStr ? toDateObj(draftFromStr) : undefined;
  const draftToDate = draftToStr ? toDateObj(draftToStr) : undefined;
  const calendarSelected: DateRange | undefined = draftFromDate
    ? { from: draftFromDate, to: draftToDate }
    : undefined;

  const canApply = !!draftFromStr && !rangeError;

  const dateRangeLabel = dateRange
    ? dateRange.start === dateRange.end
      ? formatDisplayDate(dateRange.start, locale)
      : `${formatDisplayDate(dateRange.start, locale)} – ${formatDisplayDate(dateRange.end, locale)}`
    : null;

  return (
    <>
      <AppHeader title={t("history.title")} showBack />

      <div className="px-4 pt-3 pb-2">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="flex items-center justify-center"
              style={{ color: "var(--text-tertiary)", minWidth: 24, minHeight: 24 }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        {!isLoading && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                  style={{
                    background: isActive ? "var(--color-brand)" : "var(--bg-secondary)",
                    color: isActive ? "var(--text-on-primary)" : "var(--text-secondary)",
                    border: `1px solid ${isActive ? "transparent" : "var(--border-default)"}`,
                  }}
                >
                  {t(`filter.${f}`)}
                </button>
              );
            })}
          </div>
        )}

        {/* Wallet filter chips */}
        {!isLoading && activeWallets.length >= 2 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => setActiveWalletId(null)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
              style={{
                background: activeWalletId === null ? "var(--color-brand-soft)" : "var(--bg-secondary)",
                color: activeWalletId === null ? "var(--color-brand)" : "var(--text-secondary)",
                border: `1px solid ${activeWalletId === null ? "var(--color-brand)" : "var(--border-default)"}`,
              }}
            >
              {t("filter.all")}
            </button>
            {activeWallets.map((w) => {
              const isActive = activeWalletId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveWalletId(isActive ? null : w.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                  style={{
                    background: isActive ? "var(--color-brand-soft)" : "var(--bg-secondary)",
                    color: isActive ? "var(--color-brand)" : "var(--text-secondary)",
                    border: `1px solid ${isActive ? "var(--color-brand)" : "var(--border-default)"}`,
                  }}
                >
                  {w.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Count + sort + date filter */}
        {!isLoading && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {filtered.length > 0 ? tc("items", { count: filtered.length }) : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={openDatePicker}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                style={{
                  background: dateRange ? "var(--color-brand-soft)" : "var(--bg-secondary)",
                  color: dateRange ? "var(--color-brand)" : "var(--text-secondary)",
                  border: `1px solid ${dateRange ? "var(--color-brand)" : "var(--border-default)"}`,
                }}
                aria-label={t("history.dateFilter")}
              >
                <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                {dateRangeLabel ? (
                  <span className="max-w-[130px] truncate">{dateRangeLabel}</span>
                ) : (
                  <span>{t("history.allTime")}</span>
                )}
              </button>
              <SortPill value={sortKey} onChange={setSortKey} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-[16px] animate-pulse"
              style={{ background: "var(--bg-secondary)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={hasFilters ? t("noResults") : t("noHistory")}
          description={hasFilters ? t("noResultsDesc") : t("noHistoryDesc")}
        />
      ) : (
        <div className="px-4">
          <div className="glass rounded-[16px] overflow-hidden">
            {filtered.map((tx, idx) => (
              <div key={tx.id}>
                {idx > 0 && (
                  <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                )}
                <TransactionItem transaction={tx} wallets={wallets} showDate />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date range picker bottom sheet */}
      {isDatePickerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setIsDatePickerOpen(false)}
            aria-hidden="true"
          />
          {/* Sheet — full-width on mobile, max-width centered on desktop */}
          <div
            className="fixed bottom-0 inset-x-0 mx-auto z-50 w-full max-w-md rounded-t-[24px] flex flex-col"
            style={{
              background: "var(--bg-primary)",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-default)" }} />
            </div>

            {/* From / To fields with typed input */}
            <div className="px-4 pt-3 pb-1 flex gap-3 flex-shrink-0">
              {/* Dari */}
              <label
                className="flex-1 flex flex-col gap-1 px-3 pt-2 pb-2.5 rounded-[12px] cursor-pointer"
                style={{
                  background: "var(--bg-secondary)",
                  border: `1.5px solid ${activeField === "from" ? "var(--color-brand)" : "var(--border-default)"}`,
                }}
                onClick={() => {
                  setActiveField("from");
                  if (draftFromDate) setCalendarMonth(draftFromDate);
                }}
              >
                <span
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: activeField === "from" ? "var(--color-brand)" : "var(--text-tertiary)" }}
                >
                  {activeField === "from" && (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  )}
                  {t("history.from")}
                </span>
                <input
                  type="date"
                  value={draftFromStr}
                  max={draftToStr || toDateStr(todayDate())}
                  onFocus={() => {
                    setActiveField("from");
                    if (draftFromDate) setCalendarMonth(draftFromDate);
                  }}
                  onChange={(e) => handleFromInput(e.target.value)}
                  className="bg-transparent outline-none text-[13px] font-semibold w-full"
                  style={{
                    color: draftFromStr ? "var(--text-primary)" : "var(--text-tertiary)",
                    colorScheme: "normal",
                  }}
                />
              </label>

              {/* Hingga */}
              <label
                className="flex-1 flex flex-col gap-1 px-3 pt-2 pb-2.5 rounded-[12px] cursor-pointer"
                style={{
                  background: "var(--bg-secondary)",
                  border: `1.5px solid ${activeField === "to" ? "var(--color-brand)" : "var(--border-default)"}`,
                }}
                onClick={() => {
                  setActiveField("to");
                  if (draftToDate) setCalendarMonth(draftToDate);
                }}
              >
                <span
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: activeField === "to" ? "var(--color-brand)" : "var(--text-tertiary)" }}
                >
                  {activeField === "to" && (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  )}
                  {t("history.to")}
                </span>
                <input
                  type="date"
                  value={draftToStr}
                  min={draftFromStr}
                  max={toDateStr(todayDate())}
                  onFocus={() => {
                    setActiveField("to");
                    if (draftToDate) setCalendarMonth(draftToDate);
                  }}
                  onChange={(e) => handleToInput(e.target.value)}
                  className="bg-transparent outline-none text-[13px] font-semibold w-full"
                  style={{
                    color: draftToStr ? "var(--text-primary)" : "var(--text-tertiary)",
                    colorScheme: "normal",
                  }}
                />
              </label>
            </div>

            {/* Validation error or step hint */}
            <div className="px-4 min-h-[20px] flex-shrink-0">
              {rangeError ? (
                <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
                  {rangeError}
                </p>
              ) : (
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {activeField === "from"
                    ? t("history.pickStart")
                    : t("history.pickEnd")}
                </p>
              )}
            </div>

            {/* Calendar — constrained width so it's not zoomed on desktop */}
            <div className="flex justify-center px-2 flex-shrink-0 overflow-hidden">
              <div className="w-full max-w-[360px]">
                <Calendar
                  mode="range"
                  selected={calendarSelected}
                  onSelect={handleCalendarSelect}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  disabled={{ after: todayDate() }}
                  className="w-full [--cell-size:--spacing(8)]"
                />
              </div>
            </div>

            {/* Actions */}
            <div
              className="px-4 pt-2 flex gap-3 flex-shrink-0"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <button
                onClick={clearDateRange}
                className="flex-1 rounded-[12px] text-[13px] font-medium transition-opacity active:opacity-70"
                style={{
                  minHeight: "var(--tap-target-min)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {t("history.allTime")}
              </button>
              <button
                onClick={applyDraftRange}
                disabled={!canApply}
                className="flex-[2] rounded-[12px] text-[14px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
                style={{
                  minHeight: "var(--tap-target-min)",
                  background: "var(--color-brand)",
                  color: "var(--text-on-primary)",
                }}
              >
                {t("history.apply")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
