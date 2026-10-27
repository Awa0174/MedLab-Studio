import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useTheme, cssVar } from "@/app/theme";

export type EChartsOption = echarts.EChartsOption;
export type ECharts = echarts.ECharts;

export interface ChartTokens {
  fg: string;
  muted: string;
  faint: string;
  grid: string;
  border: string;
  surface: string;
  accent: string;
  noisy: string;
  filtered: string;
  clean: string;
  peak: string;
  trueBeat: string;
  mono: string;
}

export function readChartTokens(): ChartTokens {
  return {
    fg: cssVar("--fg"),
    muted: cssVar("--muted"),
    faint: cssVar("--faint"),
    grid: cssVar("--grid"),
    border: cssVar("--border"),
    surface: cssVar("--surface"),
    accent: cssVar("--accent"),
    noisy: cssVar("--trace-noisy"),
    filtered: cssVar("--trace-filtered"),
    clean: cssVar("--trace-clean"),
    peak: cssVar("--trace-peak"),
    trueBeat: cssVar("--trace-true"),
    mono: cssVar("--font-mono") || "monospace",
  };
}

/**
 * Owns one ECharts instance bound to a container. The option builder receives the
 * current theme tokens and is re-run whenever its dependencies or the theme change.
 */
export function useEChart(
  containerRef: RefObject<HTMLDivElement | null>,
  buildOption: (tokens: ChartTokens) => EChartsOption,
  deps: unknown[],
  opts?: { group?: string; onReady?: (chart: ECharts) => void },
): RefObject<ECharts | null> {
  const chartRef = useRef<ECharts | null>(null);
  const { theme } = useTheme();
  const onReady = opts?.onReady;
  const group = opts?.group;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    if (group) {
      chart.group = group;
      echarts.connect(group);
    }
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    onReady?.(chart);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [containerRef, group, onReady]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(buildOption(readChartTokens()), { notMerge: true, lazyUpdate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ...deps]);

  return chartRef;
}
