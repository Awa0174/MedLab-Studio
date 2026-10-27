import type { EcgSimulationResponse } from "@/api/client";
import { Metric, MetricGrid } from "@/components/results/Metric";
import { ValidationList } from "@/components/results/ValidationList";
import { fmt } from "@/lib/format";

export function ResultsPanel({ data }: { data: EcgSimulationResponse }) {
  const peaks = data.r_peaks;
  const hr = data.parameters.find((p) => p.name === "heart_rate")?.value;
  return (
    <div className="flex flex-col gap-4">
      <MetricGrid>
        <Metric label="Estimated HR" value={fmt(peaks?.estimated_hr_bpm, 1)} unit="bpm" accent />
        <Metric label="Nominal HR" value={String(hr ?? "–")} unit="bpm" />
        <Metric label="HR spread (SD)" value={fmt(peaks?.hr_sd_bpm, 2)} unit="bpm" />
        <Metric
          label="Beats true / detected"
          value={`${data.true_r_times_s.length} / ${peaks ? peaks.indices.length : "–"}`}
        />
        <Metric label="SNR noisy" value={fmt(data.stats.snr_noisy_db, 1)} unit="dB" />
        <Metric label="SNR filtered" value={fmt(data.stats.snr_filtered_db, 1)} unit="dB" />
        <Metric label="Noise RMS" value={fmt(data.stats.noise_rms_mv, 3)} unit="mV" />
        <Metric label="Residual RMS" value={fmt(data.stats.residual_rms_mv, 3)} unit="mV" />
      </MetricGrid>

      <ValidationList checks={data.validation} />

      <div className="text-faint font-mono text-[11px] leading-relaxed">
        <div>
          model {data.model.name} v{data.model.version}
        </div>
        <div>
          {Object.entries(data.algorithm_versions)
            .map(([k, v]) => `${k} v${v}`)
            .join(" · ")}
        </div>
        {peaks ? <div>detector {peaks.method}</div> : null}
      </div>
    </div>
  );
}
