import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useEcgStore } from "@/labs/ecg/store";
import { useSimulation } from "@/labs/ecg/useSimulation";
import { ParameterPanel } from "@/labs/ecg/ParameterPanel";
import { ResultsPanel } from "@/labs/ecg/ResultsPanel";
import { ExplainPanel } from "@/labs/ecg/ExplainPanel";
import { SignalChart } from "@/labs/ecg/SignalChart";
import type { Measurement, TraceKey } from "@/labs/ecg/traces";
import { SpectrumChart } from "@/labs/ecg/SpectrumChart";
import { useExperiment } from "@/api/hooks";
import type { EcgSimulationRequest } from "@/api/client";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SwitchField } from "@/components/ui/fields";
import { SaveExperimentDialog } from "@/experiments/SaveExperimentDialog";
import { fmt, shortHash } from "@/lib/format";

export function EcgLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const experimentId = searchParams.get("experiment");
  const experiment = useExperiment(experimentId);
  const {
    loadExperiment,
    clearLoaded,
    loaded,
    autoRun,
    setAutoRun,
    run,
    compareMode,
    setCompareMode,
    showClean,
    setShowClean,
    showTrueBeats,
    setShowTrueBeats,
  } = useEcgStore();
  const sim = useSimulation();
  const [measurement, setMeasurement] = useState<Measurement>({ a: null, b: null });
  const [saveOpen, setSaveOpen] = useState(false);

  // Load a stored experiment's configuration into the lab.
  useEffect(() => {
    if (experiment.data && experiment.data.id !== loaded?.id) {
      loadExperiment(
        {
          id: experiment.data.id,
          name: experiment.data.name,
          resultHash: experiment.data.result_hash,
        },
        experiment.data.config as EcgSimulationRequest,
      );
    }
  }, [experiment.data, loaded?.id, loadExperiment]);

  // Ctrl+Enter runs the simulation in manual mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const data = sim.data;
  const traces: TraceKey[] = showClean
    ? ["noisy_mv", "filtered_mv", "clean_mv"]
    : ["noisy_mv", "filtered_mv"];
  const reproducible = loaded?.resultHash && data ? data.result_hash === loaded.resultHash : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-surface flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-fg-strong text-base font-semibold">ECG Signal Analysis</h1>
          <p className="text-muted text-xs">
            Synthetic Lead II · simulation · not a patient signal
          </p>
        </div>
        {loaded ? (
          <div className="flex items-center gap-2">
            <Badge tone="accent">experiment · {loaded.name}</Badge>
            {reproducible === null ? null : (
              <Badge tone={reproducible ? "ok" : "warn"}>
                {reproducible ? "reproduced · hash identical" : "modified · hash differs"}
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
        <SwitchField
          label="Auto-run"
          checked={autoRun}
          onCheckedChange={setAutoRun}
          className="gap-2"
        />
        <Button
          variant={sim.isStale && !autoRun ? "primary" : "secondary"}
          size="sm"
          onClick={run}
          disabled={autoRun && !sim.isStale}
          title="Ctrl+Enter"
        >
          {sim.isFetching ? "Running…" : "Run simulation"}
        </Button>
        <Button variant="primary" size="sm" onClick={() => setSaveOpen(true)} disabled={!data}>
          Save experiment
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[19rem_minmax(0,1fr)_20rem] lg:overflow-hidden">
        <Panel className="min-h-0 lg:overflow-hidden">
          <PanelHeader title="Simulation" subtitle="Parameters with units" />
          <PanelBody className="overflow-y-auto">
            <ParameterPanel />
          </PanelBody>
        </Panel>

        <Panel className="min-h-0 lg:overflow-hidden">
          <Tabs defaultValue="signal" className="flex h-full min-h-0 flex-col">
            <PanelHeader
              title="Signal"
              subtitle={
                data
                  ? `${data.time_s.length.toLocaleString()} samples · ${fmt(data.time_s[data.time_s.length - 1], 2)} s`
                  : "waiting for backend"
              }
              actions={
                <>
                  <TabsList>
                    <TabsTrigger value="signal">Time</TabsTrigger>
                    <TabsTrigger value="spectrum">Spectrum</TabsTrigger>
                  </TabsList>
                  <Segmented
                    label="Comparison mode"
                    value={compareMode}
                    onChange={setCompareMode}
                    options={[
                      { value: "overlay", label: "Overlay" },
                      { value: "stacked", label: "Stacked" },
                    ]}
                  />
                </>
              }
            />
            <PanelBody className="flex min-h-0 flex-col overflow-y-auto">
              {sim.error ? (
                <div className="bg-danger/10 text-danger border-danger/30 mb-3 rounded-md border px-3 py-2 text-xs">
                  {sim.error.message}
                </div>
              ) : null}
              {!data ? (
                <div className="text-muted flex flex-1 items-center justify-center text-sm">
                  {sim.isFetching ? "Computing…" : "No data yet."}
                </div>
              ) : (
                <>
                  <TabsContent value="signal" className="flex flex-col gap-2">
                    {compareMode === "overlay" ? (
                      <SignalChart
                        data={data}
                        traces={traces}
                        showTrueBeats={showTrueBeats}
                        measurement={measurement}
                        onMeasure={setMeasurement}
                        height={420}
                      />
                    ) : (
                      <>
                        <SignalChart
                          data={data}
                          traces={["noisy_mv"]}
                          showPeaks={false}
                          showTrueBeats={showTrueBeats}
                          group="ecg-stacked"
                          height={220}
                          title="Noisy input"
                          measureTrace="noisy_mv"
                          measurement={measurement}
                          onMeasure={setMeasurement}
                        />
                        <SignalChart
                          data={data}
                          traces={showClean ? ["filtered_mv", "clean_mv"] : ["filtered_mv"]}
                          showTrueBeats={showTrueBeats}
                          group="ecg-stacked"
                          height={220}
                          title="Filtered output"
                          measurement={measurement}
                          onMeasure={setMeasurement}
                        />
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-4 px-1">
                      <SwitchField
                        label="Show clean ground truth"
                        checked={showClean}
                        onCheckedChange={setShowClean}
                        className="gap-2"
                      />
                      <SwitchField
                        label="Mark true beats"
                        checked={showTrueBeats}
                        onCheckedChange={setShowTrueBeats}
                        className="gap-2"
                      />
                      {measurement.a ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMeasurement({ a: null, b: null })}
                        >
                          clear markers
                        </Button>
                      ) : null}
                    </div>
                  </TabsContent>
                  <TabsContent value="spectrum">
                    <SpectrumChart data={data} height={420} />
                  </TabsContent>
                </>
              )}
            </PanelBody>
            <footer className="border-border text-faint flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-1.5 font-mono text-[11px]">
              <span>fs {sim.request?.signal?.sampling_rate_hz ?? "–"} Hz</span>
              <span>seed {sim.request?.seed ?? "–"}</span>
              <span>filters {sim.request?.filters?.map((f) => f.type).join(" → ") || "none"}</span>
              <span>hash {shortHash(data?.result_hash)}</span>
              <span>{sim.elapsedMs !== null ? `${fmt(sim.elapsedMs, 0)} ms` : ""}</span>
              {sim.isStale && !autoRun ? (
                <span className="text-warn">parameters changed · run to update</span>
              ) : null}
            </footer>
          </Tabs>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          <Panel className="min-h-0 shrink-0 lg:max-h-[55%] lg:overflow-hidden">
            <PanelHeader title="Results" subtitle="Analysis and validation" />
            <PanelBody className="overflow-y-auto">
              {data ? <ResultsPanel data={data} /> : <p className="text-muted text-sm">–</p>}
            </PanelBody>
          </Panel>
          <Panel className="min-h-0 flex-1 lg:overflow-hidden">
            <PanelHeader title="Explain" subtitle="Model, assumptions, limits, verification" />
            <PanelBody className="overflow-y-auto">
              <ExplainPanel />
            </PanelBody>
          </Panel>
        </div>
      </div>

      {data && sim.request ? (
        <SaveExperimentDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          config={sim.request}
          summary={`${data.true_r_times_s.length} beats, est. ${fmt(data.r_peaks?.estimated_hr_bpm, 1)} bpm`}
        />
      ) : null}
    </div>
  );
}
