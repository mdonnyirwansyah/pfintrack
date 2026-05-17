"use client";

import { PieChart, Pie, Sector, ResponsiveContainer } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import { useMounted } from "@/hooks/useMounted";
import type { CategoryBreakdown } from "@/lib/report/calculations";
import { formatIDR } from "@/lib/format/number";

interface DonutChartProps {
  readonly data: CategoryBreakdown[];
  readonly onCategorySelect?: (category: string) => void;
  readonly selectedCategory?: string | null;
  readonly centerLabel?: string;
}

function renderSectorShape(
  props: PieSectorShapeProps,
  activeIndex: number,
  dimmed: boolean,
  onCellClick: ((category: string) => void) | undefined,
  category: string,
) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, index } = props;
  const isActive = index === activeIndex;
  const cursor = onCellClick ? "pointer" : "default";
  const handleClick = onCellClick ? () => onCellClick(category) : undefined;

  if (!isActive) {
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={dimmed ? 0.35 : 1}
        style={{ cursor }}
        onClick={handleClick}
      />
    );
  }

  return (
    <g style={{ cursor }} onClick={handleClick}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.2}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
}

export function DonutChart({
  data,
  onCategorySelect,
  selectedCategory,
  centerLabel,
}: DonutChartProps) {
  const mounted = useMounted();
  if (data.length === 0) return null;

  const activeIndex = selectedCategory
    ? data.findIndex((d) => d.category === selectedCategory)
    : -1;

  const total = data.reduce((sum, d) => sum + d.total, 0);

  const centerLabelData = selectedCategory && activeIndex >= 0
    ? { label: selectedCategory, amount: data[activeIndex].total, color: data[activeIndex].color }
    : { label: centerLabel ?? "Total", amount: total, color: "var(--text-secondary)" };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        role="img"
        aria-label={`${centerLabelData.label}: ${formatIDR(centerLabelData.amount)}`}
        style={{ width: "100%", height: 240, position: "relative" }}
      >
        {mounted ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <PieChart>
            <Pie
              data={data.map((d) => ({ ...d, fill: d.color }))}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={2}
              dataKey="total"
              strokeWidth={0}
              shape={(props: PieSectorShapeProps) => {
                const idx = typeof props.index === "number" ? props.index : 0;
                const entry = data[idx];
                const dimmed = Boolean(selectedCategory && selectedCategory !== entry?.category);
                return renderSectorShape(props, activeIndex, dimmed, onCategorySelect, entry?.category ?? "");
              }}
            />
          </PieChart>
        </ResponsiveContainer> : null}

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
            className="text-[10px] font-medium truncate"
            style={{ color: "var(--text-tertiary)", marginBottom: 2 }}
          >
            {centerLabelData.label}
          </p>
          <p
            className="text-[13px] font-bold tabular-nums leading-tight"
            style={{ color: centerLabelData.color === "var(--text-secondary)" ? "var(--text-primary)" : centerLabelData.color }}
          >
            {formatIDR(centerLabelData.amount)}
          </p>
        </div>
      </div>

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

              <span
                className="flex-1 text-[13px] text-left font-medium truncate"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {entry.category}
              </span>

              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: isActive ? entry.color : "var(--text-tertiary)" }}
              >
                {entry.percentage.toFixed(1)}%
              </span>

              <span
                className="text-[13px] font-semibold tabular-nums ml-1"
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
