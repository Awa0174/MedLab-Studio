import { create } from "zustand";
import type { ReactionAnalysisResponse, ReactionDataset, ReactionDesign } from "@/api/client";
import type { LoadedExperiment } from "@/labs/ecg/store";
import { DEFAULT_DESIGN, DEFAULT_SYNTHETIC } from "@/labs/reaction-time/defaults";
import type { SyntheticParams } from "@/labs/reaction-time/defaults";

interface RtState {
  design: ReactionDesign;
  synthetic: SyntheticParams;
  dataset: ReactionDataset | null;
  analysis: ReactionAnalysisResponse | null;
  loaded: LoadedExperiment | null;
  setDesign: (patch: Partial<ReactionDesign>) => void;
  setSynthetic: (patch: Partial<SyntheticParams>) => void;
  setDataset: (dataset: ReactionDataset | null) => void;
  setAnalysis: (analysis: ReactionAnalysisResponse | null) => void;
  loadExperiment: (
    loaded: LoadedExperiment,
    dataset: ReactionDataset,
    analysis: ReactionAnalysisResponse | null,
  ) => void;
  clearLoaded: () => void;
  reset: () => void;
}

export function normaliseDesign(partial: Partial<ReactionDesign> | undefined): ReactionDesign {
  return { ...DEFAULT_DESIGN, ...(partial ?? {}) };
}

export const useRtStore = create<RtState>((set) => ({
  design: { ...DEFAULT_DESIGN },
  synthetic: { ...DEFAULT_SYNTHETIC },
  dataset: null,
  analysis: null,
  loaded: null,
  setDesign: (patch) =>
    set((s) => {
      const design = { ...s.design, ...patch };
      if (design.foreperiod_max_ms < design.foreperiod_min_ms) {
        design.foreperiod_max_ms = design.foreperiod_min_ms;
      }
      return { design };
    }),
  setSynthetic: (patch) => set((s) => ({ synthetic: { ...s.synthetic, ...patch } })),
  setDataset: (dataset) => set({ dataset, analysis: null }),
  setAnalysis: (analysis) => set({ analysis }),
  loadExperiment: (loaded, dataset, analysis) =>
    set({ loaded, dataset, analysis, design: normaliseDesign(dataset.design) }),
  clearLoaded: () => set({ loaded: null }),
  reset: () =>
    set({
      design: { ...DEFAULT_DESIGN },
      synthetic: { ...DEFAULT_SYNTHETIC },
      dataset: null,
      analysis: null,
      loaded: null,
    }),
}));
