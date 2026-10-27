import { useCallback, useRef } from "react";
import { useEChart } from "@/components/charts/useEChart";
import type { ChartTokens, EChartsOption } from "@/components/charts/useEChart";

export interface BarSeries {
  name: string;
  values: (number | null)[];
  color: keyof Pick<ChartTokens, "filtered" | "clean" | "noisy" | "peak" | "trueBeat" | "accent">;
}

/** Categories on the x-axis, one bar per series (e.g. variant A vs B). */
export function GroupedBarChart({
  categories,
  series,
  unit,
  height = 240,
  label,
  horizontal = false,
}: {
  categories: string[];
  series: BarSeries[];
  unit?: string;
  height?: number;
  label: string;
  horizontal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buildOption = useCallback(
    (tk: ChartTokens): EChartsOption => {
      const axis = { color: tk.muted, fontFamily: tk.mono, fontSize: 10 };
      const catAxis = {
        type: "category" as const,
        data: categories,
        axisLabel: { ...axis, interval: 0 },
        axisLine: { lineStyle: { color: tk.border } },
        axisTick: { show: false },
      };
      const valAxis = {
        type: "value" as const,
        name: unit ? `${label} [${unit}]` : label,
        nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
        axisLabel: axis,
        splitLine: { lineStyle: { color: tk.grid } },
      };
      return {
        backgroundColor: "transparent",
        animation: false,
        grid: { left: horizontal ? 110 : 56, right: 16, top: 28, bottom: horizontal ? 32 : 40 },
        legend: { top: 0, right: 8, textStyle: { color: tk.muted, fontSize: 11 }, itemWidth: 10 },
        tooltip: {
          trigger: "axis",
          backgroundColor: tk.surface,
          borderColor: tk.border,
          textStyle: { color: tk.fg, fontFamily: tk.mono, fontSize: 11 },
          valueFormatter: (v) =>
            v == null ? "–" : `${Number(v).toFixed(1)}${unit ? ` ${unit}` : ""}`,
        },
        xAxis: horizontal ? valAxis : catAxis,
        yAxis: horizontal ? catAxis : valAxis,
        series: series.map((s) => ({
          name: s.name,
          type: "bar",
          data: s.values,
          itemStyle: { color: tk[s.color] },
          barMaxWidth: 28,
        })),
      };
    },
    [categories, series, unit, label, horizontal],
  );
  useEChart(containerRef, buildOption, [buildOption]);
  return <div ref={containerRef} style={{ height }} role="img" aria-label={label} />;
}
