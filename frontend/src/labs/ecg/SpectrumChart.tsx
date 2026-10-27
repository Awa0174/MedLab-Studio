import { useCallback, useRef } from "react";
import type { EcgSimulationResponse } from "@/api/client";
import { useEChart } from "@/components/charts/useEChart";
import type { ChartTokens, EChartsOption } from "@/components/charts/useEChart";

export function SpectrumChart({
  data,
  height = 300,
}: {
  data: EcgSimulationResponse;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spectrum = data.spectrum;

  const buildOption = useCallback(
    (tk: ChartTokens): EChartsOption => {
      if (!spectrum) return {};
      const axisStyle = { color: tk.muted, fontFamily: tk.mono, fontSize: 10 };
      return {
        backgroundColor: "transparent",
        animation: false,
        grid: { left: 56, right: 16, top: 24, bottom: 40 },
        legend: {
          top: 2,
          right: 12,
          textStyle: { color: tk.muted, fontSize: 11 },
          icon: "rect",
          itemWidth: 14,
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: tk.surface,
          borderColor: tk.border,
          textStyle: { color: tk.fg, fontFamily: tk.mono, fontSize: 11 },
          valueFormatter: (v) => `${Number(v).toFixed(1)} dB`,
        },
        xAxis: {
          type: "value",
          name: "f [Hz]",
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          min: 0,
          max: spectrum.frequency_hz[spectrum.frequency_hz.length - 1],
          axisLabel: axisStyle,
          axisLine: { lineStyle: { color: tk.border } },
          splitLine: { lineStyle: { color: tk.grid } },
        },
        yAxis: {
          type: "value",
          name: "PSD [dB re 1 mV²/Hz]",
          nameTextStyle: { color: tk.faint, fontFamily: tk.mono, fontSize: 10 },
          axisLabel: axisStyle,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: tk.grid } },
        },
        dataZoom: [{ type: "inside", xAxisIndex: 0, filterMode: "none" }],
        series: [
          {
            name: "Noisy",
            type: "line",
            showSymbol: false,
            lineStyle: { color: tk.noisy, width: 1 },
            itemStyle: { color: tk.noisy },
            data: spectrum.frequency_hz.map((f, i) => [f, spectrum.noisy_db[i] ?? 0]),
          },
          {
            name: "Filtered",
            type: "line",
            showSymbol: false,
            lineStyle: { color: tk.filtered, width: 1.4 },
            itemStyle: { color: tk.filtered },
            data: spectrum.frequency_hz.map((f, i) => [f, spectrum.filtered_db[i] ?? 0]),
          },
        ],
      };
    },
    [spectrum],
  );

  useEChart(containerRef, buildOption, [buildOption]);

  if (!spectrum) return <p className="text-muted p-4 text-sm">Spectrum not requested.</p>;
  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        style={{ height }}
        role="img"
        aria-label="Power spectral density of noisy and filtered signal"
      />
      <p className="text-faint px-2 pt-1 font-mono text-[11px]">
        {spectrum.method} · wheel to zoom
      </p>
    </div>
  );
}
