import type { DescriptiveStats, ReactionAnalysisResponse } from "@/api/client";
import { Metric, MetricGrid } from "@/components/results/Metric";
import { ValidationList } from "@/components/results/ValidationList";
import { fmt } from "@/lib/format";

export function ReactionResultsPanel({ data }: { data: ReactionAnalysisResponse }) {
  const s = data.summary;
  const c = data.counts;
  return (
    <div className="flex flex-col gap-4">
      <MetricGrid>
        <Metric label="Median" value={fmt(s.median, 1)} unit="ms" accent />
        <Metric label="Mean" value={fmt(s.mean, 1)} unit="ms" />
        <Metric label="MAD" value={fmt(s.mad, 1)} unit="ms" />
        <Metric label="SD" value={fmt(s.sd, 1)} unit="ms" />
        <Metric
          label="95 % CI median"
          value={`${fmt(s.ci95_median_low, 0)}–${fmt(s.ci95_median_high, 0)}`}
          unit="ms"
        />
        <Metric
          label="95 % CI mean"
          value={`${fmt(s.ci95_mean_low, 0)}–${fmt(s.ci95_mean_high, 0)}`}
          unit="ms"
        />
        <Metric label="Valid / total" value={`${c.n_valid} / ${c.n_total}`} />
        <Metric
          label="Anticip. / timeout / wrong"
          value={`${c.n_anticipated} / ${c.n_timed_out} / ${c.n_incorrect}`}
        />
        <Metric label="Outliers (Tukey)" value={String(c.n_outliers)} />
        <Metric
          label="Median w/o outliers"
          value={fmt(data.summary_without_outliers.median, 1)}
          unit="ms"
        />
        <Metric
          label="Trend"
          value={data.trend.slope_per_trial == null ? "–" : fmt(data.trend.slope_per_trial, 2)}
          unit="ms/trial"
          title={data.trend.note}
        />
        <Metric
          label="Trend p"
          value={
            data.trend.p_value == null
              ? "–"
              : data.trend.p_value < 0.001
                ? "<0.001"
                : fmt(data.trend.p_value, 3)
          }
        />
      </MetricGrid>

      {Object.keys(data.by_condition).length > 1 ? (
        <ConditionTable byCondition={data.by_condition} />
      ) : null}

      <div>
        <h3 className="text-fg mb-1.5 text-xs font-semibold">Uncertainty budget</h3>
        <table className="w-full text-[11px]">
          <tbody>
            {data.uncertainty.components.map((u) => (
              <tr key={u.name} className="border-border border-b last:border-b-0" title={u.note}>
                <td className="text-muted py-1 pr-2">
                  {u.name}
                  <span className="text-faint ml-1">({u.kind})</span>
                </td>
                <td className="tabular py-1 text-right font-mono">
                  {u.standard_ms == null ? "unquantified" : `${fmt(u.standard_ms, 2)} ms`}
                </td>
              </tr>
            ))}
            <tr className="text-fg-strong">
              <td className="py-1 pr-2 font-medium">combined standard (k=1)</td>
              <td className="tabular py-1 text-right font-mono">
                {fmt(data.uncertainty.combined_standard_ms, 2)} ms
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-faint mt-1 text-[11px] leading-snug">{data.uncertainty.note}</p>
      </div>

      <ValidationList checks={data.validation} />

      <div className="text-faint font-mono text-[11px] leading-relaxed">
        <div>
          {data.model.name} v{data.model.version}
        </div>
        <div>
          {Object.entries(data.algorithm_versions)
            .map(([k, v]) => `${k} v${v}`)
            .join(" · ")}
        </div>
        <div>source: {data.data_source.kind}</div>
      </div>
    </div>
  );
}

function ConditionTable({ byCondition }: { byCondition: Record<string, DescriptiveStats> }) {
  return (
    <div>
      <h3 className="text-fg mb-1.5 text-xs font-semibold">By condition</h3>
      <table className="w-full text-[11px]">
        <thead className="text-faint">
          <tr>
            <th className="text-left font-medium">condition</th>
            <th className="text-right font-medium">n</th>
            <th className="text-right font-medium">median</th>
            <th className="text-right font-medium">MAD</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byCondition).map(([k, v]) => (
            <tr key={k} className="border-border border-b last:border-b-0">
              <td className="text-fg py-1">{k}</td>
              <td className="tabular py-1 text-right font-mono">{v.n}</td>
              <td className="tabular py-1 text-right font-mono">{fmt(v.median, 1)}</td>
              <td className="tabular py-1 text-right font-mono">{fmt(v.mad, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
