import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  HmiAnalysisResponse,
  HmiDataset,
  HmiTaskResult,
  HmiTaskSpec,
  HmiVariant,
  TimingInfo,
  TlxRating,
} from "@/api/client";
import { useAnalyzeHmi, useExperiment, useHmiTasks } from "@/api/hooks";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SelectField, SliderField } from "@/components/ui/fields";
import { ExplainSections } from "@/components/ExplainSections";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { SaveExperimentDialog } from "@/experiments/SaveExperimentDialog";
import { useHmiStore } from "@/labs/hmi/store";
import { HMI_EXPLAIN } from "@/labs/hmi/explain";
import { TLX_SCALES, VARIANT_INFO } from "@/labs/hmi/defaults";
import { useHmiRunner } from "@/labs/hmi/useHmiRunner";
import { VariantA } from "@/labs/hmi/VariantA";
import { VariantB } from "@/labs/hmi/VariantB";
import { TlxForm } from "@/labs/hmi/TlxForm";
import { HmiResultsPanel } from "@/labs/hmi/HmiResultsPanel";
import { fmt, shortHash } from "@/lib/format";

const KIND_LABELS: Record<string, string> = {
  set_rate: "rate",
  set_vtbi: "VTBI",
  set_bolus: "bolus",
  ack_alarm: "alarm",
};

export function HmiLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const experimentId = searchParams.get("experiment");
  const experiment = useExperiment(experimentId);
  const {
    design,
    dataset,
    analysis,
    loaded,
    setDesign,
    setDataset,
    setAnalysis,
    loadExperiment,
    clearLoaded,
    reset,
  } = useHmiStore();
  const tasks = useHmiTasks(design.seed, design.tasks_per_variant);
  const analyze = useAnalyzeHmi();
  const [saveOpen, setSaveOpen] = useState(false);
  const [stickyUnits, setStickyUnits] = useState<Record<"rate" | "vtbi" | "bolus", string>>({
    rate: "mL/h",
    vtbi: "mL",
    bolus: "mg",
  });

  useEffect(() => {
    const e = experiment.data;
    if (e && e.id !== loaded?.id && e.lab_type === "hmi") {
      const response = (e.results as { response?: HmiAnalysisResponse }).response ?? null;
      loadExperiment(
        { id: e.id, name: e.name, resultHash: e.result_hash },
        e.config as unknown as HmiDataset,
        response,
      );
    }
  }, [experiment.data, loaded?.id, loadExperiment]);

  const onComplete = useCallback(
    async (
      results: HmiTaskResult[],
      tlx: Partial<Record<HmiVariant, TlxRating>>,
      timing: TimingInfo,
      taskSpecs: HmiTaskSpec[],
    ) => {
      clearLoaded();
      const ds: HmiDataset = {
        design: { ...design, tasks: taskSpecs },
        timing,
        results,
        tlx: { A: tlx.A ?? null, B: tlx.B ?? null },
      };
      setDataset(ds);
      setAnalysis(await analyze.mutateAsync(ds));
    },
    [design, analyze, clearLoaded, setDataset, setAnalysis],
  );

  const runner = useHmiRunner(design, tasks.data, onComplete);
  const running = runner.state.phase === "running" || runner.state.phase === "measuring";
  const step = runner.state.step;
  const reproducible =
    loaded?.resultHash && analysis ? analysis.result_hash === loaded.resultHash : null;

  const taskArea = (() => {
    if (runner.state.phase === "measuring")
      return <p className="text-muted text-sm">Measuring timing…</p>;
    if (!step || runner.state.phase === "idle" || runner.state.phase === "done") {
      return (
        <div className="text-muted mx-auto max-w-md text-sm">
          <p>
            You will solve {design.tasks_per_variant} tasks with each interface variant, first{" "}
            {design.variant_order === "AB" ? "A" : "B"}, then{" "}
            {design.variant_order === "AB" ? "B" : "A"}, and rate the workload after each block.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
            <li>
              <b>{VARIANT_INFO.A.name}</b>: {VARIANT_INFO.A.description}
            </li>
            <li>
              <b>{VARIANT_INFO.B.name}</b>: {VARIANT_INFO.B.description}
            </li>
          </ul>
          {runner.state.phase === "done" ? (
            <p className="text-ok mt-3 font-mono text-xs">Session complete.</p>
          ) : null}
        </div>
      );
    }
    if (step.kind === "tlx")
      return <TlxForm variant={step.variant} onDone={(r) => runner.rateTlx(step.variant, r)} />;
    if (step.kind === "task") {
      const { task, variant } = step.item;
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-accent/10 border-accent/30 w-full max-w-md rounded-md border px-3 py-2">
            <div className="text-faint text-[10px] tracking-wider uppercase">
              {VARIANT_INFO[variant].name} · task {runner.state.completed + 1} /{" "}
              {runner.state.total}
            </div>
            <div className="text-fg-strong text-sm font-semibold" data-testid="hmi-instruction">
              {task.instruction}
            </div>
          </div>
          {variant === "A" ? (
            <VariantA
              key={`${variant}-${task.id}`}
              task={task}
              stickyUnits={stickyUnits}
              alarmOrder={runner.alarmOrder(task.id)}
              onInteract={runner.interact}
              onSubmit={(s, units) => {
                setStickyUnits(units);
                runner.submit(s);
              }}
            />
          ) : (
            <VariantB
              key={`${variant}-${task.id}`}
              task={task}
              onInteract={runner.interact}
              onSubmit={runner.submit}
            />
          )}
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-surface flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-fg-strong text-base font-semibold">Human-Machine Interaction Lab</h1>
          <p className="text-muted text-xs">
            Two infusion-pump interface variants · operating errors, task time, workload · simulated
            device
          </p>
        </div>
        {loaded ? (
          <div className="flex items-center gap-2">
            <Badge tone="accent">experiment · {loaded.name}</Badge>
            {reproducible === null ? null : (
              <Badge tone={reproducible ? "ok" : "warn"}>
                {reproducible ? "stored result · hash identical" : "hash differs"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearLoaded();
                setSearchParams({});
              }}
            >
              detach
            </Button>
          </div>
        ) : null}
        <div className="flex-1" />
        {running ? (
          <Button variant="danger" size="sm" onClick={runner.abort}>
            Abort session
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => void runner.start()}
            disabled={!tasks.data}
            data-testid="hmi-start"
          >
            Start session
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSaveOpen(true)}
          disabled={!dataset || !analysis}
        >
          Save experiment
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[19rem_minmax(0,1fr)_21rem] lg:overflow-hidden">
        <Panel className="min-h-0 lg:overflow-hidden">
          <PanelHeader title="Design" subtitle="Within-subject A/B" />
          <PanelBody className="flex flex-col gap-3 overflow-y-auto">
            <SliderField
              label="Tasks per variant"
              unit="1"
              value={design.tasks_per_variant}
              min={3}
              max={16}
              step={1}
              onChange={(v) => setDesign({ tasks_per_variant: Math.round(v) })}
              disabled={running}
              hint="Rate, VTBI, bolus and alarm tasks in rotation"
            />
            <SelectField
              label="Variant order"
              value={design.variant_order}
              options={[
                { value: "AB", label: "A then B" },
                { value: "BA", label: "B then A" },
              ]}
              onChange={(v) => setDesign({ variant_order: v })}
              disabled={running}
              hint="Repeat with the other order to counterbalance learning"
            />
            <SliderField
              label="Task timeout"
              unit="s"
              value={design.timeout_ms / 1000}
              min={5}
              max={120}
              step={5}
              onChange={(v) => setDesign({ timeout_ms: v * 1000 })}
              disabled={running}
            />
            <SliderField
              label="Seed"
              unit="1"
              value={design.seed}
              min={0}
              max={9999}
              step={1}
              onChange={(v) => setDesign({ seed: Math.round(v) })}
              disabled={running}
              hint="Task values, orders and alarm button layout"
            />
            {tasks.data ? (
              <div>
                <h3 className="text-fg mb-1 text-xs font-semibold">Task set</h3>
                <ol className="text-muted list-decimal space-y-0.5 pl-4 text-[11px]">
                  {tasks.data.map((t) => (
                    <li key={t.id}>{t.instruction}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={reset} disabled={running}>
                Reset
              </Button>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="min-h-0 lg:overflow-hidden">
          <PanelHeader
            title="Device simulator"
            subtitle={
              step?.kind === "task"
                ? `${step.item.variant === "A" ? VARIANT_INFO.A.name : VARIANT_INFO.B.name}`
                : dataset
                  ? `${dataset.results.length} tasks recorded`
                  : "simulated infusion pump · no real device"
            }
          />
          <PanelBody className="flex flex-col gap-4 overflow-y-auto">
            {taskArea}
            {analyze.error ? (
              <div className="bg-danger/10 text-danger border-danger/30 rounded-md border px-3 py-2 text-xs">
                {analyze.error.message}
              </div>
            ) : null}
            {analysis ? (
              <div className="grid gap-3 md:grid-cols-2">
                <GroupedBarChart
                  label="Median task time"
                  unit="s"
                  categories={analysis.by_kind.map((k) => KIND_LABELS[k.kind] ?? k.kind)}
                  series={[
                    {
                      name: "A",
                      color: "noisy",
                      values: analysis.by_kind.map((k) =>
                        k.median_time_a_ms == null ? null : k.median_time_a_ms / 1000,
                      ),
                    },
                    {
                      name: "B",
                      color: "filtered",
                      values: analysis.by_kind.map((k) =>
                        k.median_time_b_ms == null ? null : k.median_time_b_ms / 1000,
                      ),
                    },
                  ]}
                  height={220}
                />
                <GroupedBarChart
                  label="Errors by type"
                  categories={Array.from(
                    new Set([
                      ...Object.keys(analysis.variants.A?.errors_by_type ?? {}),
                      ...Object.keys(analysis.variants.B?.errors_by_type ?? {}),
                    ]),
                  ).map((k) => k.replaceAll("_", " "))}
                  series={[
                    { name: "A", color: "noisy", values: errorValues(analysis, "A") },
                    { name: "B", color: "filtered", values: errorValues(analysis, "B") },
                  ]}
                  height={220}
                  horizontal
                />
                {analysis.variants.A?.tlx && analysis.variants.B?.tlx ? (
                  <div className="md:col-span-2">
                    <GroupedBarChart
                      label="NASA-TLX scales"
                      unit="/100"
                      categories={TLX_SCALES.map((s) => s.label)}
                      series={[
                        {
                          name: "A",
                          color: "noisy",
                          values: TLX_SCALES.map((s) => analysis.variants.A!.tlx![s.key]),
                        },
                        {
                          name: "B",
                          color: "filtered",
                          values: TLX_SCALES.map((s) => analysis.variants.B!.tlx![s.key]),
                        },
                      ]}
                      height={200}
                    />
                  </div>
                ) : null}
              </div>
            ) : analyze.isPending ? (
              <p className="text-muted text-sm">Analysing…</p>
            ) : null}
          </PanelBody>
          <footer className="border-border text-faint flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-1.5 font-mono text-[11px]">
            <span>order {design.variant_order}</span>
            <span>seed {design.seed}</span>
            <span>tasks {design.tasks_per_variant} × 2</span>
            <span>hash {shortHash(analysis?.result_hash)}</span>
            {analysis ? (
              <span>median A−B {fmt((analysis.comparison.time.median_diff ?? 0) / 1000, 2)} s</span>
            ) : null}
          </footer>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          <Panel className="min-h-0 shrink-0 lg:max-h-[60%] lg:overflow-hidden">
            <PanelHeader title="Results" subtitle="Errors, times, workload, validation" />
            <PanelBody className="overflow-y-auto">
              {analysis ? (
                <HmiResultsPanel data={analysis} />
              ) : (
                <p className="text-muted text-sm">Run a session to compare the variants.</p>
              )}
            </PanelBody>
          </Panel>
          <Panel className="min-h-0 flex-1 lg:overflow-hidden">
            <PanelHeader title="Explain" subtitle="Taxonomy, statistics, limits" />
            <PanelBody className="overflow-y-auto">
              <ExplainSections sections={HMI_EXPLAIN} />
            </PanelBody>
          </Panel>
        </div>
      </div>

      {dataset && analysis ? (
        <SaveExperimentDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          labType="hmi"
          config={dataset as unknown as Record<string, unknown>}
          defaultName="HMI A/B"
          summary={`A ${analysis.variants.A?.errors_total ?? 0} errors, B ${analysis.variants.B?.errors_total ?? 0} errors`}
          onSaved={(created) => {
            loadExperiment(
              { id: created.id, name: created.name, resultHash: created.result_hash },
              dataset,
              analysis,
            );
            setSearchParams({ experiment: created.id }, { replace: true });
          }}
        />
      ) : null}
    </div>
  );
}

function errorValues(analysis: HmiAnalysisResponse, variant: "A" | "B"): (number | null)[] {
  const keys = Array.from(
    new Set([
      ...Object.keys(analysis.variants.A?.errors_by_type ?? {}),
      ...Object.keys(analysis.variants.B?.errors_by_type ?? {}),
    ]),
  );
  const map = analysis.variants[variant]?.errors_by_type ?? {};
  return keys.map((k) => map[k] ?? 0);
}
