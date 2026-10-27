import { useCallback, useRef } from "react";
import { useEChart } from "@/components/charts/useEChart";
import type { ChartTokens, EChartsOption } from "@/components/charts/useEChart";

export interface HistogramData {
  bin_edges: number[];
  counts: number[];
  bin_width: number;
}

export function HistogramChart({
  data,
  median,
  mean,
  unit = "ms",
  height = 260,
  label = "Reaction time",
}: {
  data: HistogramData;
  median?: number | null;
  mean?: number | null;
  unit?: string;
  height?: number;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buildOption = useCallback(
    (tk: ChartTokens): EChartsOption => {
      const axis = { color: tk.muted, fontFamily: tk.mono, fontSize: 10 };
      const bars = data.counts.map((c, i) => [
        ((data.bin_edges[i] ?? 0) + (data.bin_edges[i + 1] ?? 0)) / 2,
        c,
      ]);
      const marks: { xAxis: number; name: string }[] = [];
      if (median != null) marks.push({ xAxis: median, name: "median" });
      if (mean != null) marks.push({ xAxis: mean, name: "mean" });
      return {
        backgroundColor: "transparent",
        animation: false,
        grid: { left: 48, right: 16, top: 20, bottom: 40 },
        tooltip: {
          trigger: "axis",
          backgroundColor: tk.surface,
          borderColor: tk.border,
          textStyle: { color: tk.fg, fontFamily: tk.mono, fontSize: 11 },
          formatter: (p: unknown) => {
            const it = (Array.isArray(p) ? p[0] : p) as { value: [number, number] };
            const lo = it.value[0] - data.bin_width / 2;
            return `${lo.toFixed(0)}–${(lo + data.bin_width).toFixed(0)} ${unit}: <b>${it.value[1]}</b>`;
          },
        },
        xAxis: {
          type: "value",
          name: `${label} [${unit}]`,
          nameLocation: "middle",
          nameGap: 26,
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          min: data.bin_edges[0],
          max: data.bin_edges[data.bin_edges.length - 1],
          axisLabel: axis,
          axisLine: { lineStyle: { color: tk.border } },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          name: "count",
          minInterval: 1,
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          axisLabel: axis,
          splitLine: { lineStyle: { color: tk.grid } },
        },
        series: [
          {
            type: "bar",
            data: bars,
            barWidth: "92%",
            itemStyle: { color: tk.filtered, opacity: 0.85 },
            markLine: {
              silent: true,
              symbol: "none",
              animation: false,
              lineStyle: { color: tk.clean, width: 1.2, type: "dashed" },
              label: {
                formatter: (p: { name?: string }) => p.name ?? "",
                color: tk.clean,
                fontFamily: tk.mono,
                fontSize: 10,
              },
              data: marks,
            },
          },
        ],
      };
    },
    [data, median, mean, unit, label],
  );
  useEChart(containerRef, buildOption, [buildOption]);
  return (
    <div ref={containerRef} style={{ height }} role="img" aria-label={`Histogram of ${label}`} />
  );
}
