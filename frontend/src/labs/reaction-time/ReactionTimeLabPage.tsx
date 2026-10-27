import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  ReactionAnalysisResponse,
  ReactionDataset,
  ReactionTrial,
  TimingInfo,
} from "@/api/client";
import { useAnalyzeReaction, useExperiment, useSimulateReaction } from "@/api/hooks";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SelectField, SliderField } from "@/components/ui/fields";
import { CollapsibleSection } from "@/components/ui/Collapsible";
import { ExplainSections } from "@/components/ExplainSections";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { SequenceChart } from "@/components/charts/SequenceChart";
import { SaveExperimentDialog } from "@/experiments/SaveExperimentDialog";
import { useRtStore } from "@/labs/reaction-time/store";
import { RT_RANGES } from "@/labs/reaction-time/defaults";
import { RT_EXPLAIN } from "@/labs/reaction-time/explain";
import { useReactionRunner } from "@/labs/reaction-time/useReactionRunner";
import { StimulusArea } from "@/labs/reaction-time/StimulusArea";
import { ReactionResultsPanel } from "@/labs/reaction-time/ReactionResultsPanel";
import { fmt, shortHash } from "@/lib/format";

export function ReactionTimeLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const experimentId = searchParams.get("experiment");
  const experiment = useExperiment(experimentId);
  const {
    design,
    synthetic,
    dataset,
    analysis,
    loaded,
    setDesign,
    setSynthetic,
    setDataset,
    setAnalysis,
    loadExperiment,
    clearLoaded,
    reset,
  } = useRtStore();
  const analyze = useAnalyzeReaction();
  const simulate = useSimulateReaction();
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    const e = experiment.data;
    if (e && e.id !== loaded?.id && e.lab_type === "reaction-time") {
      const response = (e.results as { response?: ReactionAnalysisResponse }).response ?? null;
      loadExperiment(
        { id: e.id, name: e.name, resultHash: e.result_hash },
        e.config as unknown as ReactionDataset,
        response,
      );
    }
  }, [experiment.data, loaded?.id, loadExperiment]);

  const runAnalysis = useCallback(
    async (ds: ReactionDataset) => {
      setDataset(ds);
      const result = await analyze.mutateAsync(ds);
      setAnalysis(result);
    },
    [analyze, setDataset, setAnalysis],
  );

  const onComplete = useCallback(
    (trials: ReactionTrial[], timing: TimingInfo) => {
      clearLoaded();
      void runAnalysis({ design, timing, trials, source: "measured" });
    },
    [design, runAnalysis, clearLoaded],
  );

  const runner = useReactionRunner(design, onComplete);
  const running = runner.state.phase !== "idle" && runner.state.phase !== "done";

  const loadSynthetic = async () => {
    clearLoaded();
    const ds = await simulate.mutateAsync({ design, ...synthetic });
    await runAnalysis(ds);
  };

  const reproducible =
    loaded?.resultHash && analysis ? analysis.result_hash === loaded.resultHash : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-surface flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-fg-strong text-base font-semibold">Reaction Time Lab</h1>
          <p className="text-muted text-xs">
            Browser measurement with an explicit uncertainty budget · not a clinical test
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
        <Button size="sm" onClick={loadSynthetic} disabled={running || simulate.isPending}>
          Load synthetic data
        </Button>
        {running ? (
          <Button variant="danger" size="sm" onClick={runner.abort}>
            Abort block
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => void runner.start()}
            data-testid="rt-start"
          >
            Start block
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
          <PanelHeader title="Design" subtitle="Experiment parameters" />
          <PanelBody className="overflow-y-auto">
            <CollapsibleSection title="Task" defaultOpen>
              <div className="flex flex-col gap-3 pt-1">
                <SelectField
                  label="Task"
                  value={design.task}
                  options={[
                    { value: "simple", label: "Simple (Space)" },
                    { value: "choice", label: "Choice (← / →)" },
                  ]}
                  onChange={(v) => setDesign({ task: v })}
                  disabled={running}
                />
                <SliderField
                  label="Trials"
                  unit="1"
                  value={design.n_trials}
                  {...RT_RANGES.n_trials}
                  onChange={(v) => setDesign({ n_trials: Math.round(v) })}
                  disabled={running}
                  hint="≥ 20 valid trials recommended"
                />
                <SliderField
                  label="Foreperiod min"
                  unit="ms"
                  value={design.foreperiod_min_ms}
                  {...RT_RANGES.foreperiod_min_ms}
                  onChange={(v) => setDesign({ foreperiod_min_ms: v })}
                  disabled={running}
                />
                <SliderField
                  label="Foreperiod max"
                  unit="ms"
                  value={design.foreperiod_max_ms}
                  {...RT_RANGES.foreperiod_max_ms}
                  onChange={(v) => setDesign({ foreperiod_max_ms: v })}
                  disabled={running}
                />
                <SliderField
                  label="Timeout"
                  unit="ms"
                  value={design.timeout_ms}
                  {...RT_RANGES.timeout_ms}
                  onChange={(v) => setDesign({ timeout_ms: v })}
                  disabled={running}
                />
                <SliderField
                  label="Anticipation threshold"
                  unit="ms"
                  value={design.anticipation_threshold_ms}
                  {...RT_RANGES.anticipation_threshold_ms}
                  onChange={(v) => setDesign({ anticipation_threshold_ms: v })}
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
                  hint="Foreperiods, sides, bootstrap"
                />
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Synthetic data (ex-Gaussian)">
              <div className="flex flex-col gap-3 pt-1">
                <SliderField
                  label="μ"
                  unit="ms"
                  value={synthetic.mu_ms}
                  {...RT_RANGES.mu_ms}
                  onChange={(v) => setSynthetic({ mu_ms: v })}
                />
                <SliderField
                  label="σ"
                  unit="ms"
                  value={synthetic.sigma_ms}
                  {...RT_RANGES.sigma_ms}
                  onChange={(v) => setSynthetic({ sigma_ms: v })}
                />
                <SliderField
                  label="τ"
                  unit="ms"
                  value={synthetic.tau_ms}
                  {...RT_RANGES.tau_ms}
                  onChange={(v) => setSynthetic({ tau_ms: v })}
                />
                <SliderField
                  label="Practice slope"
                  unit="ms/trial"
                  value={synthetic.practice_slope_ms_per_trial}
                  {...RT_RANGES.practice_slope_ms_per_trial}
                  onChange={(v) => setSynthetic({ practice_slope_ms_per_trial: v })}
                />
              </div>
            </CollapsibleSection>
            <div className="flex justify-end pt-3">
              <Button variant="ghost" size="sm" onClick={reset} disabled={running}>
                Reset
              </Button>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="min-h-0 lg:overflow-hidden">
          <PanelHeader
            title="Measurement"
            subtitle={
              runner.state.timing
                ? `frame ${fmt(runner.state.timing.frame_interval_ms, 2)} ms · timer ${fmt(runner.state.timing.timer_resolution_ms, 3)} ms`
                : dataset
                  ? `${dataset.trials.length} trials · ${dataset.source}`
                  : "no data yet"
            }
          />
          <PanelBody className="flex flex-col gap-4 overflow-y-auto">
            <StimulusArea
              phase={runner.state.phase}
              task={design.task}
              index={runner.state.index}
              total={design.n_trials}
              lastTrial={runner.state.lastTrial}
              stimulusRef={runner.stimulusRef}
            />
            {analyze.error ? (
              <div className="bg-danger/10 text-danger border-danger/30 rounded-md border px-3 py-2 text-xs">
                {analyze.error.message}
              </div>
            ) : null}
            {analysis ? (
              <>
                <HistogramChart
                  data={analysis.histogram}
                  median={analysis.summary.median}
                  mean={analysis.summary.mean}
                  height={240}
                />
                <SequenceChart
                  points={analysis.trials.map((t) => ({
                    index: t.index,
                    value: t.reaction_ms ?? null,
                    valid: t.valid,
                    outlier: t.outlier,
                    label: t.timed_out
                      ? "timeout"
                      : t.anticipated
                        ? "anticipation"
                        : !t.correct
                          ? "wrong key"
                          : t.condition,
                  }))}
                  trend={
                    analysis.trend.slope_per_trial != null && analysis.trend.intercept != null
                      ? {
                          slope: analysis.trend.slope_per_trial,
                          intercept: analysis.trend.intercept,
                        }
                      : null
                  }
                  height={220}
                />
              </>
            ) : analyze.isPending ? (
              <p className="text-muted text-sm">Analysing…</p>
            ) : null}
          </PanelBody>
          <footer className="border-border text-faint flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-1.5 font-mono text-[11px]">
            <span>task {design.task}</span>
            <span>seed {design.seed}</span>
            <span>source {dataset?.source ?? "–"}</span>
            <span>hash {shortHash(analysis?.result_hash)}</span>
          </footer>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          <Panel className="min-h-0 shrink-0 lg:max-h-[60%] lg:overflow-hidden">
            <PanelHeader title="Results" subtitle="Statistics, uncertainty, validation" />
            <PanelBody className="overflow-y-auto">
              {analysis ? (
                <ReactionResultsPanel data={analysis} />
              ) : (
                <p className="text-muted text-sm">Run a block or load synthetic data.</p>
              )}
            </PanelBody>
          </Panel>
          <Panel className="min-h-0 flex-1 lg:overflow-hidden">
            <PanelHeader title="Explain" subtitle="Method, validity, uncertainty, limits" />
            <PanelBody className="overflow-y-auto">
              <ExplainSections sections={RT_EXPLAIN} />
            </PanelBody>
          </Panel>
        </div>
      </div>

      {dataset && analysis ? (
        <SaveExperimentDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          labType="reaction-time"
          config={dataset as unknown as Record<string, unknown>}
          defaultName="Reaction time"
          summary={`${analysis.counts.n_valid} valid trials, median ${fmt(analysis.summary.median, 0)} ms`}
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
