"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parseISO,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { formatDisplayDate } from "@/lib/format/date";
import { id as idLocale, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

interface DateNavigatorProps {
  activeDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

// Sun=0 reference week: 2023-01-01 was a Sunday
const REFERENCE_SUNDAY = new Date(2023, 0, 1);

export function DateNavigator({ activeDate, onDateChange }: DateNavigatorProps) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const dfnsLocale = locale === "id" ? idLocale : enUS;

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISO(activeDate));

  const selectedDate = parseISO(activeDate);
  const displayDate = formatDisplayDate(activeDate, locale);

  // Locale-aware single-letter weekday headers (Sun–Sat)
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(REFERENCE_SUNDAY);
    d.setDate(REFERENCE_SUNDAY.getDate() + i);
    return format(d, "EEEEE", { locale: dfnsLocale });
  });

  const handlePrev = () => {
    onDateChange(format(subDays(selectedDate, 1), "yyyy-MM-dd"));
  };

  const handleNext = () => {
    onDateChange(format(addDays(selectedDate, 1), "yyyy-MM-dd"));
  };

  const handleToggle = () => {
    if (!isOpen) setViewDate(selectedDate);
    setIsOpen((v) => !v);
  };

  const handleSelectDay = (date: Date) => {
    onDateChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  // Build calendar grid
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="flex items-center justify-between px-4 py-2">
      {/* Prev */}
      <button
        onClick={handlePrev}
        className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
        style={{
          minWidth: "var(--tap-target-min)",
          minHeight: "var(--tap-target-min)",
          color: "var(--text-primary)",
        }}
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Date button + popup */}
      <div className="relative flex-1 flex justify-center">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1 text-[14px] font-semibold transition-opacity active:opacity-70"
          style={{
            color: "var(--text-primary)",
            minHeight: "var(--tap-target-min)",
          }}
        >
          {displayDate}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-tertiary)", marginLeft: 2 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {/* Calendar popup */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popup */}
            <div
              className="absolute top-full mt-2 z-50 rounded-[16px] p-4 shadow-xl"
              style={{
                background: "var(--bg-secondary)",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                border: "1px solid var(--border-default)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.40)",
                width: 280,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewDate((d) => subMonths(d, 1))}
                  className="flex items-center justify-center rounded-full active:opacity-60"
                  style={{
                    width: 32,
                    height: 32,
                    color: "var(--text-secondary)",
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {format(viewDate, "MMMM yyyy", { locale: dfnsLocale })}
                </span>

                <button
                  type="button"
                  onClick={() => setViewDate((d) => addMonths(d, 1))}
                  className="flex items-center justify-center rounded-full active:opacity-60"
                  style={{
                    width: 32,
                    height: 32,
                    color: "var(--text-secondary)",
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {weekdays.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-medium py-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, viewDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className="flex items-center justify-center rounded-full text-[12px] font-medium transition-all active:scale-90"
                      style={{
                        height: 36,
                        background: isSelected
                          ? "var(--color-primary)"
                          : "transparent",
                        color: isSelected
                          ? "#fff"
                          : !isCurrentMonth
                          ? "var(--text-tertiary)"
                          : isTodayDate
                          ? "var(--color-primary)"
                          : "var(--text-primary)",
                        fontWeight: isTodayDate && !isSelected ? 700 : undefined,
                        outline: isTodayDate && !isSelected
                          ? "1.5px solid var(--color-primary)"
                          : undefined,
                      }}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--divider)" }}>
                <button
                  type="button"
                  onClick={() => handleSelectDay(new Date())}
                  className="w-full text-[12px] font-medium py-1.5 rounded-[8px] transition-opacity active:opacity-70"
                  style={{
                    color: "var(--color-primary)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  {tc("today")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Next */}
      <button
        onClick={handleNext}
        className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
        style={{
          minWidth: "var(--tap-target-min)",
          minHeight: "var(--tap-target-min)",
          color: "var(--text-primary)",
        }}
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
