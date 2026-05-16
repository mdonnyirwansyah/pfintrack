"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, CalendarDays, FileSearch, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortPill, SortKey, applySortKey } from "@/components/shared/SortPill";
import { TransactionItem } from "../_components/TransactionItem";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { Calendar } from "@/components/ui/calendar";
import { useTranslations, useLocale } from "next-intl";
import { formatDisplayDate } from "@/lib/format/date";
import type { DateRange } from "react-day-picker";
import type { Transaction } from "@/lib/types/transaction";

type FilterType = "all" | "income" | "expense" | "transfer" | "balanceCorrection";

const FILTERS: FilterType[] = ["all", "income", "expense", "transfer", "balanceCorrection"];

function matchesTypeFilter(tx: Transaction, activeFilter: FilterType): boolean {
  if (activeFilter === "all") return true;
  if (activeFilter === "balanceCorrection") return tx.category === "Balance Correction";
  return tx.type === activeFilter && tx.category !== "Balance Correction";
}

function matchesSearch(tx: Transaction, q: string, walletMap: Map<string, string>): boolean {
  const walletName = walletMap.get(tx.wallet_id) ?? "";
  const destWalletName = tx.destination_wallet_id
    ? (walletMap.get(tx.destination_wallet_id) ?? "")
    : "";
  return (
    (tx.title?.toLowerCase().includes(q) ?? false) ||
    (tx.category?.toLowerCase().includes(q) ?? false) ||
    (tx.description?.toLowerCase().includes(q) ?? false) ||
    walletName.toLowerCase().includes(q) ||
    destWalletName.toLowerCase().includes(q)
  );
}

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

function buildDateRangeLabel(
  dateRange: { start: string; end: string } | null,
  locale: string
): string | null {
  if (!dateRange) return null;
  if (dateRange.start === dateRange.end) return formatDisplayDate(dateRange.start, locale);
  return `${formatDisplayDate(dateRange.start, locale)} – ${formatDisplayDate(dateRange.end, locale)}`;
}

function applyFilters(
  transactions: Transaction[],
  activeFilter: FilterType,
  dateRange: { start: string; end: string } | null,
  activeWalletId: string | null,
  searchQuery: string,
  walletMap: Map<string, string>,
  sortKey: SortKey
): Transaction[] {
  let base = transactions.filter((tx) => matchesTypeFilter(tx, activeFilter));

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
    base = base.filter((tx) => matchesSearch(tx, q, walletMap));
  }

  return applySortKey(base, sortKey);
}

interface DatePickerState {
  isOpen: boolean;
  activeField: "from" | "to";
  draftFromStr: string;
  draftToStr: string;
  rangeError: string;
  calendarMonth: Date;
  draftFromDate: Date | undefined;
  draftToDate: Date | undefined;
  calendarSelected: DateRange | undefined;
  canApply: boolean;
}

interface DatePickerActions {
  open: (dateRange: { start: string; end: string } | null) => void;
  setActiveField: (f: "from" | "to") => void;
  setCalendarMonth: (d: Date) => void;
  handleFromInput: (val: string, errorMsg: string) => void;
  handleToInput: (val: string, errorMsg: string) => void;
  handleCalendarSelect: (range: DateRange | undefined) => void;
  applyDraftRange: (setDateRange: (r: { start: string; end: string } | null) => void) => void;
  clearDateRange: (setDateRange: (r: { start: string; end: string } | null) => void) => void;
}

function useDateRangePicker(): DatePickerState & DatePickerActions {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [draftFromStr, setDraftFromStr] = useState("");
  const [draftToStr, setDraftToStr] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(firstOfMonth());

  const draftFromDate = draftFromStr ? toDateObj(draftFromStr) : undefined;
  const draftToDate = draftToStr ? toDateObj(draftToStr) : undefined;
  const calendarSelected: DateRange | undefined = draftFromDate
    ? { from: draftFromDate, to: draftToDate }
    : undefined;
  const canApply = !!draftFromStr && !rangeError;

  function open(dateRange: { start: string; end: string } | null) {
    setDraftFromStr(dateRange?.start ?? "");
    setDraftToStr(dateRange?.end ?? "");
    setActiveField("from");
    setRangeError("");
    setCalendarMonth(dateRange ? toDateObj(dateRange.start) : firstOfMonth());
    setIsOpen(true);
  }

  function handleFromInput(val: string, errorMsg: string) {
    setDraftFromStr(val);
    setActiveField("from");
    setRangeError(val && draftToStr && val > draftToStr ? errorMsg : "");
    if (val) setCalendarMonth(toDateObj(val));
  }

  function handleToInput(val: string, errorMsg: string) {
    setDraftToStr(val);
    setActiveField("to");
    setRangeError(draftFromStr && val && draftFromStr > val ? errorMsg : "");
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

  function applyDraftRange(setDateRange: (r: { start: string; end: string } | null) => void) {
    if (!draftFromStr) return;
    const end = draftToStr || draftFromStr;
    setDateRange({ start: draftFromStr, end });
    setIsOpen(false);
  }

  function clearDateRange(setDateRange: (r: { start: string; end: string } | null) => void) {
    setDateRange(null);
    setIsOpen(false);
  }

  return {
    isOpen,
    activeField,
    draftFromStr,
    draftToStr,
    rangeError,
    calendarMonth,
    draftFromDate,
    draftToDate,
    calendarSelected,
    canApply,
    open,
    setActiveField,
    setCalendarMonth,
    handleFromInput,
    handleToInput,
    handleCalendarSelect,
    applyDraftRange,
    clearDateRange,
  };
}

function DateFieldLabel({ isActive, label, value, min, max, onFocus, onChange }: Readonly<{
  isActive: boolean;
  label: string;
  value: string;
  min?: string;
  max?: string;
  onFocus: () => void;
  onChange: (val: string) => void;
}>) {
  return (
    <label className="flex-1 flex flex-col gap-1 px-3 pt-2 pb-2.5 rounded-[12px] cursor-pointer" style={{ background: "var(--bg-secondary)", border: `1.5px solid ${isActive ? "var(--color-brand)" : "var(--border-default)"}` }}>
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: isActive ? "var(--color-brand)" : "var(--text-tertiary)" }}>
        {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
        {label}
      </span>
      <input type="date" value={value} min={min} max={max} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none text-[13px] font-semibold w-full" style={{ color: value ? "var(--text-primary)" : "var(--text-tertiary)", colorScheme: "normal" }} />
    </label>
  );
}

function DateRangePickerSheet({
  picker,
  setDateRange,
  errorMsg,
  labelFrom,
  labelTo,
  labelAllTime,
  labelApply,
  labelPickStart,
  labelPickEnd,
  labelClose,
}: Readonly<{
  picker: DatePickerState & DatePickerActions;
  setDateRange: (r: { start: string; end: string } | null) => void;
  errorMsg: string;
  labelFrom: string;
  labelTo: string;
  labelAllTime: string;
  labelApply: string;
  labelPickStart: string;
  labelPickEnd: string;
  labelClose: string;
}>) {
  const hint = picker.activeField === "from" ? labelPickStart : labelPickEnd;
  const todayMax = toDateStr(todayDate());
  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/40 cursor-default" onClick={() => picker.clearDateRange(setDateRange)} aria-label={labelClose} />
      <div className="fixed bottom-0 inset-x-0 mx-auto z-50 w-full max-w-md rounded-t-[24px] flex flex-col" style={{ background: "var(--bg-primary)", boxShadow: "0 -4px 32px rgba(0,0,0,0.18)" }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-default)" }} />
        </div>
        <div className="px-4 pt-3 pb-1 flex gap-3 flex-shrink-0">
          <DateFieldLabel
            isActive={picker.activeField === "from"}
            label={labelFrom}
            value={picker.draftFromStr}
            max={picker.draftToStr || todayMax}
            onFocus={() => { picker.setActiveField("from"); if (picker.draftFromDate) picker.setCalendarMonth(picker.draftFromDate); }}
            onChange={(val) => picker.handleFromInput(val, errorMsg)}
          />
          <DateFieldLabel
            isActive={picker.activeField === "to"}
            label={labelTo}
            value={picker.draftToStr}
            min={picker.draftFromStr}
            max={todayMax}
            onFocus={() => { picker.setActiveField("to"); if (picker.draftToDate) picker.setCalendarMonth(picker.draftToDate); }}
            onChange={(val) => picker.handleToInput(val, errorMsg)}
          />
        </div>
        <div className="px-4 min-h-[20px] flex-shrink-0">
          {picker.rangeError
            ? <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>{picker.rangeError}</p>
            : <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{hint}</p>
          }
        </div>
        <div className="flex justify-center px-2 flex-shrink-0 overflow-hidden">
          <div className="w-full max-w-[360px]">
            <Calendar mode="range" selected={picker.calendarSelected} onSelect={picker.handleCalendarSelect} month={picker.calendarMonth} onMonthChange={picker.setCalendarMonth} disabled={{ after: todayDate() }} className="w-full [--cell-size:--spacing(8)]" />
          </div>
        </div>
        <div className="px-4 pt-2 flex gap-3 flex-shrink-0" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
          <button onClick={() => picker.clearDateRange(setDateRange)} className="flex-1 rounded-[12px] text-[13px] font-medium transition-opacity active:opacity-70" style={{ minHeight: "var(--tap-target-min)", background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>{labelAllTime}</button>
          <button onClick={() => picker.applyDraftRange(setDateRange)} disabled={!picker.canApply} className="flex-[2] rounded-[12px] text-[14px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40" style={{ minHeight: "var(--tap-target-min)", background: "var(--color-brand)", color: "var(--text-on-primary)" }}>{labelApply}</button>
        </div>
      </div>
    </>
  );
}

const PAGE_SIZE = 50;

function HistoryContent({
  isLoading,
  filtered,
  wallets,
  visibleCount,
  onLoadMore,
  noResultsTitle,
  noResultsDesc,
}: Readonly<{
  isLoading: boolean;
  filtered: Transaction[];
  wallets: import("@/lib/types/wallet").Wallet[];
  visibleCount: number;
  onLoadMore: () => void;
  noResultsTitle: string;
  noResultsDesc: string;
}>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMore();
            break;
          }
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, filtered.length]);

  if (isLoading) {
    return (
      <div className="px-4 space-y-3">
        {["tx-a", "tx-b", "tx-c", "tx-d", "tx-e"].map((id) => (
          <div key={id} className="h-[52px] rounded-[16px] animate-pulse" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
    );
  }
  if (filtered.length === 0) {
    return <EmptyState icon={FileSearch} title={noResultsTitle} description={noResultsDesc} />;
  }

  const visible = filtered.length > visibleCount ? filtered.slice(0, visibleCount) : filtered;

  return (
    <div className="px-4">
      <ul className="glass rounded-[16px] overflow-hidden list-none">
        {visible.map((tx, idx) => (
          <li key={tx.id}>
            {idx > 0 && <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />}
            <TransactionItem transaction={tx} wallets={wallets} showDate />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="h-16 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="h-4 w-4 rounded-full animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
        </div>
      )}
    </div>
  );
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

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(() => ({
    start: toDateStr(firstOfMonth()),
    end: toDateStr(todayDate()),
  }));

  const picker = useDateRangePicker();

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

  const filtered = useMemo(
    () => applyFilters(transactions, activeFilter, dateRange, activeWalletId, searchQuery, walletMap, sortKey),
    [transactions, activeFilter, dateRange, activeWalletId, searchQuery, walletMap, sortKey]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, activeWalletId, searchQuery, sortKey, dateRange]);
  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_SIZE);
  }, []);

  const dateRangeLabel = buildDateRangeLabel(dateRange, locale);
  const errorMsg = t("history.errorStartAfterEnd");

  return (
    <>
      <AppHeader title={t("history.title")} showBack />

      <div className="px-4 pt-3 pb-2">
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
              aria-label={tc("clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

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

        {!isLoading && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {filtered.length > 0 ? tc("items", { count: filtered.length }) : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => picker.open(dateRange)}
                className="glass flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium outline-none cursor-pointer"
                style={{
                  color: dateRange ? "var(--color-brand)" : "var(--text-secondary)",
                  border: dateRange ? "1px solid var(--color-brand)" : undefined,
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
              <SortPill
                value={sortKey}
                onChange={setSortKey}
                options={[
                  { value: "datetime_desc", label: t("sort.datetime_desc") },
                  { value: "datetime_asc", label: t("sort.datetime_asc") },
                  { value: "amount_desc", label: t("sort.amount_desc") },
                  { value: "amount_asc", label: t("sort.amount_asc") },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <HistoryContent
        isLoading={isLoading}
        filtered={filtered}
        wallets={wallets}
        visibleCount={visibleCount}
        onLoadMore={handleLoadMore}
        noResultsTitle={hasFilters ? t("noResults") : t("noHistory")}
        noResultsDesc={hasFilters ? t("noResultsDesc") : t("noHistoryDesc")}
      />

      {picker.isOpen && (
        <DateRangePickerSheet
          picker={picker}
          setDateRange={setDateRange}
          errorMsg={errorMsg}
          labelFrom={t("history.from")}
          labelTo={t("history.to")}
          labelAllTime={t("history.allTime")}
          labelApply={t("history.apply")}
          labelPickStart={t("history.pickStart")}
          labelPickEnd={t("history.pickEnd")}
          labelClose={tc("close")}
        />
      )}
    </>
  );
}
