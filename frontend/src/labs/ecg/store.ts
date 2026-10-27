import { create } from "zustand";
import type { EcgSimulationRequest, FilterStage } from "@/api/client";
import { DEFAULT_FILTERS, DEFAULT_REQUEST } from "@/labs/ecg/defaults";

export type FilterType = FilterStage["type"];
export type CompareMode = "overlay" | "stacked";

export interface LoadedExperiment {
  id: string;
  name: string;
  resultHash: string | null;
}

interface EcgState {
  request: EcgSimulationRequest;
  autoRun: boolean;
  runToken: number;
  /** Request frozen at the last manual run (used when auto-run is off). */
  manualSnapshot: EcgSimulationRequest;
  compareMode: CompareMode;
  showClean: boolean;
  showTrueBeats: boolean;
  loaded: LoadedExperiment | null;

  setSignal: (patch: Partial<EcgSimulationRequest["signal"]>) => void;
  setNoise: (patch: Partial<EcgSimulationRequest["noise"]>) => void;
  setAnalysis: (patch: Partial<EcgSimulationRequest["analysis"]>) => void;
  setSeed: (seed: number) => void;
  toggleFilter: (type: FilterType, enabled: boolean) => void;
  updateFilter: <T extends FilterStage>(type: T["type"], patch: Partial<T>) => void;
  setAutoRun: (autoRun: boolean) => void;
  run: () => void;
  setCompareMode: (mode: CompareMode) => void;
  setShowClean: (show: boolean) => void;
  setShowTrueBeats: (show: boolean) => void;
  loadExperiment: (loaded: LoadedExperiment, request: EcgSimulationRequest) => void;
  clearLoaded: () => void;
  reset: () => void;
}

/** Canonical filter order: notch first, then band-pass, then smoothing. */
const FILTER_ORDER: FilterType[] = ["notch", "bandpass", "moving_average"];

function sortFilters(filters: FilterStage[]): FilterStage[] {
  return [...filters].sort((a, b) => FILTER_ORDER.indexOf(a.type) - FILTER_ORDER.indexOf(b.type));
}

/** Fill in any missing fields so a partial config (e.g. from a stored experiment) is complete. */
export function normaliseRequest(
  partial: Partial<EcgSimulationRequest> | undefined,
): EcgSimulationRequest {
  const p = partial ?? {};
  return {
    seed: p.seed ?? DEFAULT_REQUEST.seed,
    signal: merge(DEFAULT_REQUEST.signal!, p.signal),
    noise: merge(DEFAULT_REQUEST.noise!, p.noise),
    filters: sortFilters(
      (p.filters ?? []).map((f) => ({ ...DEFAULT_FILTERS[f.type], ...f }) as FilterStage),
    ),
    analysis: merge(DEFAULT_REQUEST.analysis!, p.analysis),
    include_spectrum: p.include_spectrum ?? true,
  };
}

function merge<T extends object>(base: T, patch: Partial<T> | undefined): T {
  return { ...base, ...(patch ?? {}) } as T;
}

export const useEcgStore = create<EcgState>((set) => ({
  request: structuredClone(DEFAULT_REQUEST),
  autoRun: true,
  runToken: 0,
  manualSnapshot: structuredClone(DEFAULT_REQUEST),
  compareMode: "overlay",
  showClean: false,
  showTrueBeats: false,
  loaded: null,

  setSignal: (patch) =>
    set((s) => ({ request: { ...s.request, signal: { ...s.request.signal!, ...patch } } })),
  setNoise: (patch) =>
    set((s) => ({ request: { ...s.request, noise: { ...s.request.noise!, ...patch } } })),
  setAnalysis: (patch) =>
    set((s) => ({ request: { ...s.request, analysis: { ...s.request.analysis!, ...patch } } })),
  setSeed: (seed) => set((s) => ({ request: { ...s.request, seed } })),
  toggleFilter: (type, enabled) =>
    set((s) => {
      const without = (s.request.filters ?? []).filter((f) => f.type !== type);
      const filters = enabled ? sortFilters([...without, { ...DEFAULT_FILTERS[type] }]) : without;
      return { request: { ...s.request, filters } };
    }),
  updateFilter: (type, patch) =>
    set((s) => ({
      request: {
        ...s.request,
        filters: (s.request.filters ?? []).map((f) =>
          f.type === type ? ({ ...f, ...patch } as FilterStage) : f,
        ),
      },
    })),
  setAutoRun: (autoRun) => set({ autoRun }),
  run: () => set((s) => ({ runToken: s.runToken + 1, manualSnapshot: s.request })),
  setCompareMode: (compareMode) => set({ compareMode }),
  setShowClean: (showClean) => set({ showClean }),
  setShowTrueBeats: (showTrueBeats) => set({ showTrueBeats }),
  loadExperiment: (loaded, request) => {
    const normalised = normaliseRequest(request);
    set({ loaded, request: normalised, manualSnapshot: normalised });
  },
  clearLoaded: () => set({ loaded: null }),
  reset: () =>
    set({
      request: structuredClone(DEFAULT_REQUEST),
      manualSnapshot: structuredClone(DEFAULT_REQUEST),
      loaded: null,
    }),
}));

export function getFilter<T extends FilterStage>(
  filters: FilterStage[] | undefined,
  type: T["type"],
): T | undefined {
  return filters?.find((f) => f.type === type) as T | undefined;
}
