import type { ChartTokens } from "@/components/charts/useEChart";

export type TraceKey = "noisy_mv" | "filtered_mv" | "clean_mv";

export interface TraceSpec {
  key: TraceKey;
  label: string;
  color: keyof Pick<ChartTokens, "noisy" | "filtered" | "clean">;
  dashed?: boolean;
  width?: number;
}

export const TRACES: Record<TraceKey, TraceSpec> = {
  noisy_mv: { key: "noisy_mv", label: "Noisy", color: "noisy", width: 1 },
  filtered_mv: { key: "filtered_mv", label: "Filtered", color: "filtered", width: 1.4 },
  clean_mv: {
    key: "clean_mv",
    label: "Clean (ground truth)",
    color: "clean",
    dashed: true,
    width: 1,
  },
};

export interface Marker {
  t: number;
  v: number;
}

export interface Measurement {
  a: Marker | null;
  b: Marker | null;
}
