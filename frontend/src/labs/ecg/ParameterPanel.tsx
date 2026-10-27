import type { Schemas } from "@/api/client";
import { SliderField, SwitchField, SelectField } from "@/components/ui/fields";
import { CollapsibleSection } from "@/components/ui/Collapsible";
import { Button } from "@/components/ui/Button";
import { RANGES } from "@/labs/ecg/defaults";
import { getFilter, useEcgStore } from "@/labs/ecg/store";

type Bandpass = Schemas["BandpassFilter"];
type Notch = Schemas["NotchFilter"];
type MovingAverage = Schemas["MovingAverageFilter"];

export function ParameterPanel() {
  const request = useEcgStore((s) => s.request);
  const { setSignal, setNoise, setAnalysis, setSeed, toggleFilter, updateFilter, reset } =
    useEcgStore();
  const signal = request.signal!;
  const noise = request.noise!;
  const analysis = request.analysis!;
  const nyquist = signal.sampling_rate_hz! / 2;

  const notch = getFilter<Notch>(request.filters, "notch");
  const bandpass = getFilter<Bandpass>(request.filters, "bandpass");
  const movingAverage = getFilter<MovingAverage>(request.filters, "moving_average");

  return (
    <div className="flex flex-col">
      <CollapsibleSection title="Signal model" defaultOpen>
        <div className="flex flex-col gap-3 pt-1">
          <SliderField
            label="Heart rate"
            unit="bpm"
            value={signal.heart_rate_bpm!}
            {...RANGES.heart_rate_bpm}
            onChange={(v) => setSignal({ heart_rate_bpm: v })}
          />
          <SliderField
            label="Sampling rate"
            unit="Hz"
            value={signal.sampling_rate_hz!}
            {...RANGES.sampling_rate_hz}
            onChange={(v) => setSignal({ sampling_rate_hz: v })}
            hint={`Nyquist ${nyquist} Hz`}
          />
          <SliderField
            label="Duration"
            unit="s"
            value={signal.duration_s!}
            {...RANGES.duration_s}
            onChange={(v) => setSignal({ duration_s: v })}
          />
          <SliderField
            label="RR variability"
            unit="σ/RR"
            value={signal.rr_variability!}
            {...RANGES.rr_variability}
            onChange={(v) => setSignal({ rr_variability: v })}
            hint="Seeded Gaussian jitter of each RR interval"
          />
          <SliderField
            label="R amplitude"
            unit="mV"
            value={signal.r_amplitude_mv!}
            {...RANGES.r_amplitude_mv}
            onChange={(v) => setSignal({ r_amplitude_mv: v })}
          />
          <SliderField
            label="Seed"
            unit="1"
            value={request.seed!}
            min={RANGES.seed.min}
            max={9999}
            step={1}
            onChange={(v) => setSeed(Math.round(v))}
            hint="Drives RR jitter and all noise streams"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Disturbances" defaultOpen>
        <div className="flex flex-col gap-3 pt-1">
          <SliderField
            label="White noise σ"
            unit="mV"
            value={noise.white_sd_mv!}
            {...RANGES.white_sd_mv}
            onChange={(v) => setNoise({ white_sd_mv: v })}
          />
          <SliderField
            label="Powerline amplitude"
            unit="mV"
            value={noise.powerline_amplitude_mv!}
            {...RANGES.powerline_amplitude_mv}
            onChange={(v) => setNoise({ powerline_amplitude_mv: v })}
          />
          <SelectField
            label="Powerline frequency"
            unit="Hz"
            value={String(noise.powerline_frequency_hz ?? 50) as "50" | "60"}
            options={[
              { value: "50", label: "50 Hz (EU)" },
              { value: "60", label: "60 Hz (US)" },
            ]}
            onChange={(v) => setNoise({ powerline_frequency_hz: Number(v) as 50 | 60 })}
          />
          <SliderField
            label="Baseline wander"
            unit="mV"
            value={noise.baseline_amplitude_mv!}
            {...RANGES.baseline_amplitude_mv}
            onChange={(v) => setNoise({ baseline_amplitude_mv: v })}
          />
          <SliderField
            label="Baseline frequency"
            unit="Hz"
            value={noise.baseline_frequency_hz!}
            {...RANGES.baseline_frequency_hz}
            onChange={(v) => setNoise({ baseline_frequency_hz: v })}
          />
          <SliderField
            label="Muscle artefact RMS"
            unit="mV"
            value={noise.muscle_amplitude_mv!}
            {...RANGES.muscle_amplitude_mv}
            onChange={(v) => setNoise({ muscle_amplitude_mv: v })}
            hint="High-pass filtered white noise above 20 Hz"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Filter chain" defaultOpen>
        <div className="flex flex-col gap-3 pt-1">
          <SwitchField
            label="1 · Notch"
            hint="IIR notch at the mains frequency"
            checked={Boolean(notch)}
            onCheckedChange={(on) => toggleFilter("notch", on)}
          />
          {notch ? (
            <div className="border-border ml-2 flex flex-col gap-3 border-l pl-3">
              <SelectField
                label="Notch frequency"
                unit="Hz"
                value={String(notch.frequency_hz ?? 50) as "50" | "60"}
                options={[
                  { value: "50", label: "50 Hz" },
                  { value: "60", label: "60 Hz" },
                ]}
                onChange={(v) => updateFilter<Notch>("notch", { frequency_hz: Number(v) })}
              />
              <SliderField
                label="Quality factor Q"
                unit="1"
                value={notch.quality_factor ?? 30}
                {...RANGES.notch_q}
                onChange={(v) => updateFilter<Notch>("notch", { quality_factor: v })}
                hint="Bandwidth = f₀ / Q"
              />
            </div>
          ) : null}
          <SwitchField
            label="2 · Butterworth band-pass"
            hint="Zero-phase, second-order sections"
            checked={Boolean(bandpass)}
            onCheckedChange={(on) => toggleFilter("bandpass", on)}
          />
          {bandpass ? (
            <div className="border-border ml-2 flex flex-col gap-3 border-l pl-3">
              <SliderField
                label="Low cut-off"
                unit="Hz"
                value={bandpass.low_hz ?? 0.5}
                {...RANGES.bandpass_low_hz}
                onChange={(v) => updateFilter<Bandpass>("bandpass", { low_hz: v })}
              />
              <SliderField
                label="High cut-off"
                unit="Hz"
                value={bandpass.high_hz ?? 40}
                min={RANGES.bandpass_high_hz.min}
                max={Math.floor(nyquist - 1)}
                step={1}
                onChange={(v) => updateFilter<Bandpass>("bandpass", { high_hz: v })}
                hint={`Must stay below Nyquist (${nyquist} Hz)`}
              />
              <SliderField
                label="Order"
                unit="1"
                value={bandpass.order ?? 4}
                {...RANGES.bandpass_order}
                onChange={(v) => updateFilter<Bandpass>("bandpass", { order: Math.round(v) })}
              />
            </div>
          ) : null}
          <SwitchField
            label="3 · Moving average"
            hint="Centred rectangular window"
            checked={Boolean(movingAverage)}
            onCheckedChange={(on) => toggleFilter("moving_average", on)}
          />
          {movingAverage ? (
            <div className="border-border ml-2 flex flex-col gap-3 border-l pl-3">
              <SliderField
                label="Window"
                unit="ms"
                value={movingAverage.window_ms ?? 20}
                {...RANGES.moving_average_window_ms}
                onChange={(v) => updateFilter<MovingAverage>("moving_average", { window_ms: v })}
              />
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Analysis">
        <div className="flex flex-col gap-3 pt-1">
          <SwitchField
            label="Detect R-peaks"
            checked={analysis.detect_r_peaks ?? true}
            onCheckedChange={(on) => setAnalysis({ detect_r_peaks: on })}
          />
          <SelectField
            label="Detector input"
            value={analysis.source ?? "filtered"}
            options={[
              { value: "filtered", label: "Filtered signal" },
              { value: "noisy", label: "Noisy signal" },
              { value: "clean", label: "Clean signal" },
            ]}
            onChange={(v) => setAnalysis({ source: v })}
          />
          <SliderField
            label="Refractory period"
            unit="ms"
            value={analysis.refractory_ms ?? 200}
            {...RANGES.refractory_ms}
            onChange={(v) => setAnalysis({ refractory_ms: v })}
            hint="Minimum RR interval accepted by the detector"
          />
        </div>
      </CollapsibleSection>

      <div className="flex justify-end pt-3">
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
