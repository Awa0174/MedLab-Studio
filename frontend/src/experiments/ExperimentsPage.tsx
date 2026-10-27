import { useState } from "react";
import { Link } from "react-router";
import {
  useDeleteExperiment,
  useExperiment,
  useExperiments,
  useRerunExperiment,
} from "@/api/hooks";
import type { ExperimentSummary } from "@/api/client";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getLab } from "@/labs/registry";
import { fmtTime, shortHash } from "@/lib/format";
import { cn } from "@/components/ui/cn";

export function ExperimentsPage() {
  const experiments = useExperiments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useExperiment(selectedId);
  const remove = useDeleteExperiment();
  const rerun = useRerunExperiment();
  const [lastRerun, setLastRerun] = useState<{ id: string; reproducible: boolean } | null>(null);

  const list = experiments.data ?? [];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Panel className="min-h-0">
        <PanelHeader
          title="Experiments"
          subtitle={`${list.length} stored locally in data/`}
          actions={
            <Button size="sm" onClick={() => experiments.refetch()}>
              Refresh
            </Button>
          }
        />
        <PanelBody className="overflow-auto p-0">
          {experiments.isError ? (
            <p className="text-danger p-4 text-sm">{experiments.error.message}</p>
          ) : list.length === 0 ? (
            <div className="text-muted p-6 text-sm">
              No experiments yet. Run a simulation in the{" "}
              <Link to="/labs/ecg" className="text-accent underline">
                ECG Signal Lab
              </Link>{" "}
              and save it.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-faint bg-surface-2 sticky top-0 text-[10px] tracking-wider uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Lab</th>
                  <th className="px-2 py-2 font-medium">Model</th>
                  <th className="px-2 py-2 font-medium">Seed</th>
                  <th className="px-2 py-2 font-medium">Created</th>
                  <th className="px-2 py-2 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <Row
                    key={e.id}
                    experiment={e}
                    selected={e.id === selectedId}
                    onSelect={() => setSelectedId(e.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </PanelBody>
      </Panel>

      <Panel className="min-h-0">
        <PanelHeader
          title="Details"
          subtitle={selected.data ? selected.data.name : "select an experiment"}
        />
        <PanelBody className="flex flex-col gap-4 overflow-y-auto">
          {selected.data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Link to={`/labs/${selected.data.lab_type}?experiment=${selected.data.id}`}>
                  <Button variant="primary" size="sm" data-testid="open-in-lab">
                    Open in lab
                  </Button>
                </Link>
                <Button
                  size="sm"
                  disabled={rerun.isPending}
                  onClick={async () => {
                    const r = await rerun.mutateAsync(selected.data!.id);
                    setLastRerun({ id: r.experiment.id, reproducible: r.reproducible });
                  }}
                >
                  {rerun.isPending ? "Re-running…" : "Re-run & verify"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete experiment "${selected.data!.name}"? This removes its stored arrays.`,
                      )
                    ) {
                      remove.mutate(selected.data!.id, { onSuccess: () => setSelectedId(null) });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
              {lastRerun?.id === selected.data.id ? (
                <Badge tone={lastRerun.reproducible ? "ok" : "warn"} className="self-start">
                  {lastRerun.reproducible
                    ? "re-run reproduced the identical result hash"
                    : "re-run produced a different hash"}
                </Badge>
              ) : null}
              {selected.data.description ? (
                <p className="text-fg text-sm">{selected.data.description}</p>
              ) : null}

              <Section title="Model">
                <Mono>
                  {selected.data.model.name} v{selected.data.model.version}
                </Mono>
                <p className="text-muted text-xs">{selected.data.model.description}</p>
                <Mono>
                  {Object.entries(selected.data.algorithm_versions)
                    .map(([k, v]) => `${k} v${v}`)
                    .join(" · ")}
                </Mono>
              </Section>

              <Section title="Parameters">
                <table className="w-full text-xs">
                  <tbody>
                    {selected.data.parameters.map((p) => (
                      <tr key={p.name} className="border-border border-b last:border-b-0">
                        <td className="text-muted py-1 pr-2">{p.name.replaceAll("_", " ")}</td>
                        <td className="tabular py-1 text-right font-mono">
                          {String(p.value)} <span className="text-faint">{p.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section title="Validation">
                <ul className="space-y-1 text-xs">
                  {selected.data.validation.map((c) => (
                    <li key={c.name} className="flex gap-2">
                      <span className={c.passed ? "text-ok" : "text-danger"}>
                        {c.passed ? "✓" : "✗"}
                      </span>
                      <span>{c.name.replaceAll("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Data sources">
                {selected.data.data_sources.map((d) => (
                  <p key={d.name} className="text-xs">
                    <Badge tone="accent" className="mr-1.5">
                      {d.kind}
                    </Badge>
                    {d.name}: <span className="text-muted">{d.description}</span>
                  </p>
                ))}
              </Section>

              <Section title="Provenance">
                <Mono>id {selected.data.id}</Mono>
                <Mono>created {fmtTime(selected.data.created_at)}</Mono>
                <Mono>sha256 {selected.data.result_hash}</Mono>
              </Section>
            </>
          ) : (
            <p className="text-muted text-sm">
              Select an experiment to see its parameters, validation and provenance.
            </p>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function Row({
  experiment: e,
  selected,
  onSelect,
}: {
  experiment: ExperimentSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const lab = getLab(e.lab_type);
  return (
    <tr
      className={cn(
        "border-border hover:bg-surface-2 cursor-pointer border-b",
        selected && "bg-surface-3",
      )}
      onClick={onSelect}
      onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect()}
      tabIndex={0}
      aria-selected={selected}
      data-testid="experiment-row"
    >
      <td className="text-fg px-4 py-2 font-medium">{e.name}</td>
      <td className="text-muted px-2 py-2">{lab?.name ?? e.lab_type}</td>
      <td className="text-muted px-2 py-2 font-mono">
        {e.model.name} v{e.model.version}
      </td>
      <td className="tabular px-2 py-2 font-mono">{e.seed ?? "–"}</td>
      <td className="text-muted tabular px-2 py-2 font-mono">{fmtTime(e.created_at)}</td>
      <td className="text-faint px-2 py-2 font-mono">{shortHash(e.result_hash)}</td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-faint text-[10px] font-semibold tracking-wider uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <div className="text-muted font-mono text-[11px] break-all">{children}</div>;
}
