import type { HmiAnalysisResponse } from "@/api/client";
import { Metric, MetricGrid } from "@/components/results/Metric";
import { ValidationList } from "@/components/results/ValidationList";
import { Badge } from "@/components/ui/Badge";
import { fmt } from "@/lib/format";

function p(v: number | null | undefined): string {
  if (v == null) return "–";
  return v < 0.001 ? "<0.001" : fmt(v, 3);
}

export function HmiResultsPanel({ data }: { data: HmiAnalysisResponse }) {
  const a = data.variants.A;
  const b = data.variants.B;
  const c = data.comparison;
  return (
    <div className="flex flex-col gap-4">
      <MetricGrid>
        <Metric label="A median time" value={fmt((a?.time.median ?? 0) / 1000, 1)} unit="s" />
        <Metric
          label="B median time"
          value={fmt((b?.time.median ?? 0) / 1000, 1)}
          unit="s"
          accent
        />
        <Metric label="A errors / tasks" value={`${a?.errors_total ?? 0} / ${a?.n_tasks ?? 0}`} />
        <Metric label="B errors / tasks" value={`${b?.errors_total ?? 0} / ${b?.n_tasks ?? 0}`} />
        <Metric
          label="A success"
          value={a?.success_rate == null ? "–" : `${Math.round(a.success_rate * 100)} %`}
        />
        <Metric
          label="B success"
          value={b?.success_rate == null ? "–" : `${Math.round(b.success_rate * 100)} %`}
        />
        <Metric label="A TLX" value={fmt(a?.tlx_overall, 0)} unit="/100" />
        <Metric label="B TLX" value={fmt(b?.tlx_overall, 0)} unit="/100" />
      </MetricGrid>

      <div>
        <h3 className="text-fg mb-1.5 text-xs font-semibold">Comparison A − B</h3>
        <table className="w-full text-[11px]">
          <tbody>
            <Row
              k="median time difference"
              v={`${fmt((c.time.median_diff ?? 0) / 1000, 2)} s [${fmt((c.time.ci95_median_diff_low ?? 0) / 1000, 2)}, ${fmt((c.time.ci95_median_diff_high ?? 0) / 1000, 2)}]`}
            />
            <Row k="Mann-Whitney U p" v={p(c.time.mann_whitney_p)} />
            <Row k="Welch t p" v={p(c.time.welch_p)} />
            <Row
              k="Cohen's d · Cliff's δ"
              v={`${fmt(c.time.cohens_d, 2)} · ${fmt(c.time.cliffs_delta, 2)}`}
            />
            <Row
              k="error-rate difference"
              v={`${fmt((c.errors.risk_difference ?? 0) * 100, 0)} pp · Fisher p ${p(c.errors.fisher_p)}`}
            />
            <Row
              k="success-rate difference"
              v={`${fmt((c.success.risk_difference ?? 0) * 100, 0)} pp · Fisher p ${p(c.success.fisher_p)}`}
            />
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-fg mb-1.5 text-xs font-semibold">Tasks</h3>
        <ul className="flex flex-col gap-1">
          {data.results.map((r) => (
            <li key={`${r.variant}-${r.task_id}`} className="flex items-start gap-2 text-[11px]">
              <Badge tone={r.variant === "A" ? "neutral" : "accent"}>{r.variant}</Badge>
              <span className="text-muted w-10 font-mono">{r.task_id}</span>
              <span className="text-fg tabular w-14 font-mono">
                {fmt(r.duration_ms / 1000, 1)} s
              </span>
              <span className="flex flex-wrap gap-1">
                {r.success ? (
                  <Badge tone="ok">ok</Badge>
                ) : (
                  r.errors.map((e) => (
                    <Badge key={e.type} tone="danger" title={e.detail}>
                      {e.type.replaceAll("_", " ")}
                    </Badge>
                  ))
                )}
              </span>
            </li>
          ))}
        </ul>
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
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-border border-b last:border-b-0">
      <td className="text-muted py-1 pr-2">{k}</td>
      <td className="tabular py-1 text-right font-mono">{v}</td>
    </tr>
  );
}
