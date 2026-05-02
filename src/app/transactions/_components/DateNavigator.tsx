"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { useRef } from "react";
import { formatDisplayDate } from "@/lib/format/date";

interface DateNavigatorProps {
  activeDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export function DateNavigator({ activeDate, onDateChange }: DateNavigatorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayDate = formatDisplayDate(activeDate);

  const handlePrev = () => {
    onDateChange(format(subDays(parseISO(activeDate), 1), "yyyy-MM-dd"));
  };

  const handleNext = () => {
    onDateChange(format(addDays(parseISO(activeDate), 1), "yyyy-MM-dd"));
  };

  const handleDateClick = () => {
    inputRef.current?.showPicker?.();
    inputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
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

      <div className="relative flex-1 flex justify-center">
        <button
          onClick={handleDateClick}
          className="flex items-center justify-center text-[15px] font-semibold active:opacity-70 transition-opacity"
          style={{ color: "var(--text-primary)", minHeight: "var(--tap-target-min)", minWidth: "var(--tap-target-min)" }}
          aria-label="Pick date"
        >
          {displayDate}
        </button>
        {/* Hidden native date input */}
        <input
          ref={inputRef}
          type="date"
          value={activeDate}
          onChange={(e) => {
            if (e.target.value) onDateChange(e.target.value);
          }}
          className="absolute inset-0 opacity-0 w-full cursor-pointer"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

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
