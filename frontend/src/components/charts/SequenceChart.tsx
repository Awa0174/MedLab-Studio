import { useCallback, useRef } from "react";
import { useEChart } from "@/components/charts/useEChart";
import type { ChartTokens, EChartsOption } from "@/components/charts/useEChart";

export interface SequencePoint {
  index: number;
  value: number | null;
  valid: boolean;
  outlier: boolean;
  label?: string;
}

export interface TrendLine {
  slope: number;
  intercept: number;
}

/** Value per trial with invalid trials and outliers marked and an optional trend line. */
export function SequenceChart({
  points,
  trend,
  unit = "ms",
  height = 240,
  label = "Reaction time",
}: {
  points: SequencePoint[];
  trend?: TrendLine | null;
  unit?: string;
  height?: number;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buildOption = useCallback(
    (tk: ChartTokens): EChartsOption => {
      const axis = { color: tk.muted, fontFamily: tk.mono, fontSize: 10 };
      const valid = points.filter((p) => p.valid && p.value != null && !p.outlier);
      const outliers = points.filter((p) => p.outlier && p.value != null);
      const invalid = points.filter((p) => !p.valid && p.value != null);
      const n = points.length;
      return {
        backgroundColor: "transparent",
        animation: false,
        grid: { left: 48, right: 16, top: 24, bottom: 40 },
        legend: {
          top: 0,
          right: 8,
          textStyle: { color: tk.muted, fontSize: 11 },
          itemWidth: 10,
        },
        tooltip: {
          trigger: "item",
          backgroundColor: tk.surface,
          borderColor: tk.border,
          textStyle: { color: tk.fg, fontFamily: tk.mono, fontSize: 11 },
          formatter: (p: unknown) => {
            const it = p as {
              seriesName: string;
              value: [number, number];
              data?: { note?: string };
            };
            return `trial ${it.value[0] + 1}: <b>${it.value[1].toFixed(1)} ${unit}</b><br/>${it.seriesName}${it.data?.note ? ` · ${it.data.note}` : ""}`;
          },
        },
        xAxis: {
          type: "value",
          name: "trial",
          nameLocation: "middle",
          nameGap: 24,
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          min: -0.5,
          max: n - 0.5,
          axisLabel: { ...axis, formatter: (v: number) => String(v + 1) },
          axisLine: { lineStyle: { color: tk.border } },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          name: `${label} [${unit}]`,
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          axisLabel: axis,
          splitLine: { lineStyle: { color: tk.grid } },
          scale: true,
        },
        series: [
          {
            name: "valid",
            type: "scatter",
            symbolSize: 7,
            itemStyle: { color: tk.filtered },
            data: valid.map((p) => ({ value: [p.index, p.value], note: p.label })),
          },
          {
            name: "outlier (Tukey)",
            type: "scatter",
            symbol: "diamond",
            symbolSize: 9,
            itemStyle: { color: tk.clean },
            data: outliers.map((p) => ({ value: [p.index, p.value], note: p.label })),
          },
          {
            name: "invalid",
            type: "scatter",
            symbol: "rect",
            symbolSize: 7,
            itemStyle: { color: tk.peak, opacity: 0.8 },
            data: invalid.map((p) => ({ value: [p.index, p.value], note: p.label })),
          },
          ...(trend
            ? [
                {
                  name: "trend",
                  type: "line" as const,
                  showSymbol: false,
                  lineStyle: { color: tk.accent, width: 1, type: "dashed" as const },
                  itemStyle: { color: tk.accent },
                  data: [
                    [0, trend.intercept],
                    [n - 1, trend.intercept + trend.slope * (n - 1)],
                  ],
                },
              ]
            : []),
        ],
      };
    },
    [points, trend, unit, label],
  );
  useEChart(containerRef, buildOption, [buildOption]);
  return <div ref={containerRef} style={{ height }} role="img" aria-label={`${label} per trial`} />;
}
