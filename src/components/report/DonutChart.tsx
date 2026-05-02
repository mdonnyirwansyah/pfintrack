"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { CategoryBreakdown } from "@/lib/report/calculations";
import { formatIDR } from "@/lib/format/number";

interface DonutChartProps {
  data: CategoryBreakdown[];
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string | null;
}

export function DonutChart({
  data,
  onCategorySelect,
  selectedCategory,
}: DonutChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Donut */}
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              dataKey="total"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={entry.color}
                  opacity={
                    selectedCategory && selectedCategory !== entry.category
                      ? 0.4
                      : 1
                  }
                  style={{ cursor: onCategorySelect ? "pointer" : "default" }}
                  onClick={() => onCategorySelect?.(entry.category)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2 mt-2">
        {data.map((entry) => (
          <button
            key={entry.category}
            className="w-full flex items-center gap-3 rounded-[10px] transition-opacity active:opacity-70"
            style={{
              padding: "8px 10px",
              background:
                selectedCategory === entry.category
                  ? "var(--color-brand-soft)"
                  : "transparent",
              minHeight: "var(--tap-target-min)",
            }}
            onClick={() => onCategorySelect?.(entry.category)}
          >
            {/* Color badge with percentage */}
            <span
              className="inline-flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0"
              style={{
                background: entry.color,
                color: "var(--text-on-primary)",
                minWidth: 42,
                height: 22,
                paddingInline: 6,
              }}
            >
              {entry.percentage.toFixed(1)}%
            </span>

            {/* Category name */}
            <span
              className="flex-1 text-[14px] text-left font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {entry.category}
            </span>

            {/* Amount */}
            <span
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {formatIDR(entry.total)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
