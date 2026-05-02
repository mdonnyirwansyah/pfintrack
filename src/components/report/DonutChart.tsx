"use client";

import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";
import type { CategoryBreakdown } from "@/lib/report/calculations";
import { formatIDR } from "@/lib/format/number";

interface DonutChartProps {
  data: CategoryBreakdown[];
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string | null;
}

// Active segment — slightly expanded with glow shadow
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill,
  } = props as {
    cx: number; cy: number;
    innerRadius: number; outerRadius: number;
    startAngle: number; endAngle: number;
    fill: string;
  };

  return (
    <g>
      {/* Glow layer behind the segment */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 4}
        outerRadius={(outerRadius as number) + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.20}
      />
      {/* Active segment — expanded */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 2}
        outerRadius={(outerRadius as number) + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
};

export function DonutChart({
  data,
  onCategorySelect,
  selectedCategory,
}: DonutChartProps) {
  if (data.length === 0) return null;

  const activeIndex = selectedCategory
    ? data.findIndex((d) => d.category === selectedCategory)
    : -1;

  const total = data.reduce((sum, d) => sum + d.total, 0);

  const centerLabel = selectedCategory && activeIndex >= 0
    ? { label: selectedCategory, amount: data[activeIndex].total, color: data[activeIndex].color }
    : { label: "Total", amount: total, color: "var(--text-secondary)" };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Donut + center label */}
      <div style={{ width: "100%", height: 240, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={2}
              dataKey="total"
              strokeWidth={0}
              // @ts-expect-error recharts typings missing activeIndex on PieProps in some versions
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              activeShape={renderActiveShape}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={entry.color}
                  opacity={
                    selectedCategory && selectedCategory !== entry.category
                      ? 0.35
                      : 1
                  }
                  style={{ cursor: onCategorySelect ? "pointer" : "default" }}
                  onClick={() => onCategorySelect?.(entry.category)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label overlay */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
            width: 112,
          }}
        >
          <p
            className="text-[11px] font-medium truncate"
            style={{ color: "var(--text-tertiary)", marginBottom: 2 }}
          >
            {centerLabel.label}
          </p>
          <p
            className="text-[14px] font-bold tabular-nums leading-tight"
            style={{ color: centerLabel.color === "var(--text-secondary)" ? "var(--text-primary)" : centerLabel.color }}
          >
            {formatIDR(centerLabel.amount)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1 mt-1">
        {data.map((entry) => {
          const isActive = selectedCategory === entry.category;
          return (
            <button
              key={entry.category}
              className="w-full flex items-center gap-3 rounded-[12px] transition-all active:opacity-70"
              style={{
                padding: "8px 10px",
                background: isActive ? `${entry.color}18` : "transparent",
                minHeight: "var(--tap-target-min)",
                boxShadow: isActive
                  ? `0 0 0 1.5px ${entry.color}60, 0 2px 8px ${entry.color}25`
                  : "none",
              }}
              onClick={() => onCategorySelect?.(entry.category)}
            >
              {/* Color dot */}
              <span
                className="flex-shrink-0 rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: entry.color,
                  opacity: isActive ? 1 : 0.8,
                  boxShadow: isActive ? `0 0 6px ${entry.color}` : "none",
                }}
              />

              {/* Category name */}
              <span
                className="flex-1 text-[14px] text-left font-medium truncate"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {entry.category}
              </span>

              {/* Percentage */}
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: isActive ? entry.color : "var(--text-tertiary)" }}
              >
                {entry.percentage.toFixed(1)}%
              </span>

              {/* Amount */}
              <span
                className="text-[14px] font-semibold tabular-nums ml-1"
                style={{ color: isActive ? entry.color : "var(--text-primary)" }}
              >
                {formatIDR(entry.total)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
