import { create } from "zustand";
import type { HmiAnalysisResponse, HmiDataset, HmiDesign } from "@/api/client";
import type { LoadedExperiment } from "@/labs/ecg/store";
import { DEFAULT_HMI_DESIGN } from "@/labs/hmi/defaults";

interface HmiState {
  design: HmiDesign;
  dataset: HmiDataset | null;
  analysis: HmiAnalysisResponse | null;
  loaded: LoadedExperiment | null;
  setDesign: (patch: Partial<HmiDesign>) => void;
  setDataset: (dataset: HmiDataset | null) => void;
  setAnalysis: (analysis: HmiAnalysisResponse | null) => void;
  loadExperiment: (
    loaded: LoadedExperiment,
    dataset: HmiDataset,
    analysis: HmiAnalysisResponse | null,
  ) => void;
  clearLoaded: () => void;
  reset: () => void;
}

export const useHmiStore = create<HmiState>((set) => ({
  design: { ...DEFAULT_HMI_DESIGN },
  dataset: null,
  analysis: null,
  loaded: null,
  setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  setDataset: (dataset) => set({ dataset, analysis: null }),
  setAnalysis: (analysis) => set({ analysis }),
  loadExperiment: (loaded, dataset, analysis) =>
    set({ loaded, dataset, analysis, design: { ...DEFAULT_HMI_DESIGN, ...dataset.design } }),
  clearLoaded: () => set({ loaded: null }),
  reset: () =>
    set({ design: { ...DEFAULT_HMI_DESIGN }, dataset: null, analysis: null, loaded: null }),
}));
