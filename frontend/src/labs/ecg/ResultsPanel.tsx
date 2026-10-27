import type { EcgSimulationResponse, ValidationCheck } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { fmt } from "@/lib/format";

export function ResultsPanel({ data }: { data: EcgSimulationResponse }) {
  const peaks = data.r_peaks;
  const hr = data.parameters.find((p) => p.name === "heart_rate")?.value;
  const allPassed = data.validation.every((c) => c.passed);
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
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
      </dl>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-fg text-xs font-semibold">Validation checks</h3>
          <Badge tone={allPassed ? "ok" : "warn"}>{allPassed ? "all passed" : "attention"}</Badge>
        </div>
        <ul className="flex flex-col gap-1">
          {data.validation.map((c) => (
            <CheckRow key={c.name} check={c} />
          ))}
        </ul>
      </div>

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

function Metric({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-2 rounded-md px-2.5 py-1.5">
      <dt className="text-faint text-[10px] tracking-wider uppercase">{label}</dt>
      <dd className={`tabular font-mono text-sm ${accent ? "text-accent" : "text-fg-strong"}`}>
        {value}
        {unit ? <span className="text-faint ml-1 text-[10px]">{unit}</span> : null}
      </dd>
    </div>
  );
}

function CheckRow({ check }: { check: ValidationCheck }) {
  const detail =
    check.expected !== null && check.expected !== undefined
      ? `expected ${check.expected}${check.tolerance ? ` ± ${check.tolerance}` : ""}, got ${check.actual ?? "–"}${check.unit ? ` ${check.unit}` : ""}`
      : "";
  return (
    <li className="flex items-start gap-2 text-xs" title={check.note ?? undefined}>
      <span
        className={`mt-0.5 font-mono ${check.passed ? "text-ok" : "text-danger"}`}
        aria-label={check.passed ? "passed" : "failed"}
      >
        {check.passed ? "✓" : "✗"}
      </span>
      <div className="min-w-0">
        <div className="text-fg">{check.name.replaceAll("_", " ")}</div>
        {detail ? <div className="text-faint tabular font-mono text-[11px]">{detail}</div> : null}
      </div>
    </li>
  );
}
