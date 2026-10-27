import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EcgSimulationResponse } from "@/api/client";
import { useEChart } from "@/components/charts/useEChart";
import type { ChartTokens, ECharts, EChartsOption } from "@/components/charts/useEChart";
import { fmt } from "@/lib/format";
import { TRACES } from "@/labs/ecg/traces";
import type { Measurement, TraceKey } from "@/labs/ecg/traces";

interface Props {
  data: EcgSimulationResponse;
  traces: TraceKey[];
  showPeaks?: boolean;
  showTrueBeats?: boolean;
  group?: string;
  height?: number;
  measurement?: Measurement;
  onMeasure?: (next: Measurement) => void;
  /** Which trace the measurement cursor reads values from. */
  measureTrace?: TraceKey;
  title?: string;
}

function nearestIndex(time: number[], t: number): number {
  const dt = time.length > 1 ? time[1]! - time[0]! : 1;
  return Math.max(0, Math.min(time.length - 1, Math.round(t / dt)));
}

export function SignalChart({
  data,
  traces,
  showPeaks = true,
  showTrueBeats = false,
  group,
  height = 360,
  measurement,
  onMeasure,
  measureTrace = "filtered_mv",
  title,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ t: number; values: Record<string, number> } | null>(null);

  const measureRef = useRef(measurement);
  useEffect(() => {
    measureRef.current = measurement;
  }, [measurement]);

  const onReady = useCallback(
    (chart: ECharts) => {
      chart.getZr().on("click", (e: { offsetX: number; offsetY: number; event?: MouseEvent }) => {
        if (!onMeasure) return;
        const point = chart.convertFromPixel({ gridIndex: 0 }, [e.offsetX, e.offsetY]) as
          number[] | undefined;
        if (!point || !Number.isFinite(point[0])) return;
        const t = point[0]!;
        const idx = nearestIndex(data.time_s, t);
        const v = data[measureTrace][idx] ?? 0;
        const marker = { t: data.time_s[idx] ?? t, v };
        const current = measureRef.current ?? { a: null, b: null };
        const shift = Boolean(e.event?.shiftKey);
        onMeasure(
          shift || (current.a && !current.b) ? { ...current, b: marker } : { a: marker, b: null },
        );
      });
    },
    [data, measureTrace, onMeasure],
  );

  const buildOption = useCallback(
    (tk: ChartTokens): EChartsOption => {
      const series: NonNullable<EChartsOption["series"]> = traces.map((key) => {
        const spec = TRACES[key];
        return {
          name: spec.label,
          type: "line",
          showSymbol: false,
          sampling: "lttb",
          animation: false,
          lineStyle: {
            width: spec.width ?? 1,
            color: tk[spec.color],
            type: spec.dashed ? "dashed" : "solid",
          },
          itemStyle: { color: tk[spec.color] },
          emphasis: { disabled: true },
          data: data.time_s.map((t, i) => [t, data[key][i] ?? 0]),
        };
      });

      if (showPeaks && data.r_peaks) {
        const src = traces.includes("filtered_mv") ? "filtered_mv" : (traces[0] ?? "filtered_mv");
        series.push({
          name: "R-peaks",
          type: "scatter",
          symbol: "circle",
          symbolSize: 7,
          animation: false,
          itemStyle: { color: tk.peak, borderColor: tk.surface, borderWidth: 1 },
          data: data.r_peaks.indices.map((i) => [data.time_s[i] ?? 0, data[src][i] ?? 0]),
          z: 10,
        });
      }

      if (showTrueBeats) {
        const yMin = Math.min(...traces.map((k) => Math.min(...data[k])));
        series.push({
          name: "True beats",
          type: "scatter",
          symbol: "triangle",
          symbolSize: 8,
          animation: false,
          itemStyle: { color: tk.trueBeat },
          data: data.true_r_times_s.map((t) => [t, yMin]),
          z: 9,
        });
      }

      const markers: { xAxis: number; label: string }[] = [];
      if (measurement?.a) markers.push({ xAxis: measurement.a.t, label: "A" });
      if (measurement?.b) markers.push({ xAxis: measurement.b.t, label: "B" });
      if (markers.length && series[0]) {
        (series[0] as Record<string, unknown>).markLine = {
          silent: true,
          symbol: "none",
          animation: false,
          lineStyle: { color: tk.accent, width: 1, type: "solid" },
          label: {
            formatter: (p: { data?: { label?: string } }) => p.data?.label ?? "",
            color: tk.accent,
            fontFamily: tk.mono,
            position: "insideEndTop",
          },
          data: markers.map((m) => ({ xAxis: m.xAxis, label: m.label })),
        };
      }

      return {
        backgroundColor: "transparent",
        animation: false,
        title: title
          ? {
              text: title,
              left: 8,
              top: 4,
              textStyle: { color: tk.muted, fontSize: 11, fontWeight: "normal" },
            }
          : undefined,
        grid: { left: 56, right: 16, top: title ? 28 : 16, bottom: 56 },
        legend: {
          top: 2,
          right: 12,
          textStyle: { color: tk.muted, fontSize: 11 },
          itemWidth: 14,
          icon: "rect",
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            label: { backgroundColor: tk.border, color: tk.fg, fontFamily: tk.mono },
          },
          backgroundColor: tk.surface,
          borderColor: tk.border,
          textStyle: { color: tk.fg, fontFamily: tk.mono, fontSize: 11 },
          formatter: (params: unknown) => {
            const items = (Array.isArray(params) ? params : [params]) as {
              seriesName: string;
              value: [number, number];
              marker: string;
            }[];
            const first = items[0];
            if (!first) return "";
            const lines = items
              .filter((it) => Array.isArray(it.value))
              .map((it) => `${it.marker} ${it.seriesName}: <b>${fmt(it.value[1], 3)} mV</b>`);
            return `t = ${fmt(first.value[0], 3)} s<br/>${lines.join("<br/>")}`;
          },
        },
        xAxis: {
          type: "value",
          name: "t [s]",
          nameLocation: "end",
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          min: 0,
          max: data.time_s[data.time_s.length - 1],
          axisLine: { lineStyle: { color: tk.border } },
          axisLabel: { color: tk.muted, fontFamily: tk.mono, fontSize: 10 },
          splitLine: { lineStyle: { color: tk.grid } },
        },
        yAxis: {
          type: "value",
          name: "mV",
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          axisLine: { show: false },
          axisLabel: { color: tk.muted, fontFamily: tk.mono, fontSize: 10 },
          splitLine: { lineStyle: { color: tk.grid } },
          scale: true,
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
          },
          {
            type: "slider",
            xAxisIndex: 0,
            filterMode: "none",
            height: 22,
            bottom: 8,
            borderColor: tk.border,
            backgroundColor: tk.surface,
            fillerColor: "rgba(76, 201, 240, 0.12)",
            dataBackground: { lineStyle: { color: tk.faint }, areaStyle: { color: tk.grid } },
            selectedDataBackground: {
              lineStyle: { color: tk.accent },
              areaStyle: { color: tk.accent, opacity: 0.2 },
            },
            handleStyle: { color: tk.accent, borderColor: tk.accent },
            textStyle: { color: tk.muted, fontFamily: tk.mono, fontSize: 10 },
            labelFormatter: (v: number) => `${v.toFixed(2)} s`,
          },
        ],
        series,
      };
    },
    [data, traces, showPeaks, showTrueBeats, measurement, title],
  );

  const chartRef = useEChart(containerRef, buildOption, [buildOption], { group, onReady });

  // Keyboard zoom: +/- and arrow keys when the chart has focus.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const chart = chartRef.current;
    if (!chart) return;
    const opt = chart.getOption() as { dataZoom?: { start?: number; end?: number }[] };
    const dz = opt.dataZoom?.[0];
    if (!dz) return;
    let { start = 0, end = 100 } = dz;
    const span = end - start;
    if (e.key === "+" || e.key === "=") {
      start += span * 0.1;
      end -= span * 0.1;
    } else if (e.key === "-") {
      start = Math.max(0, start - span * 0.1);
      end = Math.min(100, end + span * 0.1);
    } else if (e.key === "ArrowRight") {
      const d = Math.min(span * 0.1, 100 - end);
      start += d;
      end += d;
    } else if (e.key === "ArrowLeft") {
      const d = Math.min(span * 0.1, start);
      start -= d;
      end -= d;
    } else if (e.key === "0") {
      start = 0;
      end = 100;
    } else return;
    e.preventDefault();
    chart.dispatchAction({ type: "dataZoom", start, end });
  };

  const info = useMemo(() => {
    if (!measurement?.a) return null;
    const a = measurement.a;
    const b = measurement.b;
    if (!b) return `A: t=${fmt(a.t, 3)} s, ${fmt(a.v, 3)} mV  —  shift+click for B`;
    const dt = Math.abs(b.t - a.t);
    return `A→B: Δt = ${fmt(dt * 1000, 1)} ms, ΔV = ${fmt(b.v - a.v, 3)} mV${dt > 0 ? `, 60/Δt = ${fmt(60 / dt, 1)} bpm` : ""}`;
  }, [measurement]);

  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        style={{ height }}
        tabIndex={0}
        role="img"
        aria-label={`ECG signal chart showing ${traces.map((t) => TRACES[t].label).join(", ")}`}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
        className="focus-visible:outline-accent w-full rounded outline-none focus-visible:outline-1"
      />
      <div className="text-faint flex items-center justify-between px-2 pt-1 font-mono text-[11px]">
        <span>
          {info ?? "click: marker A · shift+click: marker B · wheel/drag: zoom · keys: + − ← → 0"}
        </span>
        {hover ? <span>{fmt(hover.t, 3)} s</span> : null}
      </div>
    </div>
  );
}
