import type { ReactionDesign, ReactionSimulationRequest } from "@/api/client";

export const DEFAULT_DESIGN: ReactionDesign = {
  task: "simple",
  n_trials: 30,
  foreperiod_min_ms: 1000,
  foreperiod_max_ms: 3000,
  timeout_ms: 2000,
  anticipation_threshold_ms: 100,
  seed: 42,
};

export type SyntheticParams = Omit<ReactionSimulationRequest, "design">;

export const DEFAULT_SYNTHETIC: SyntheticParams = {
  mu_ms: 250,
  sigma_ms: 30,
  tau_ms: 80,
  choice_penalty_ms: 80,
  error_rate: 0.05,
  anticipation_rate: 0.02,
  practice_slope_ms_per_trial: -0.5,
};

export const RT_RANGES = {
  n_trials: { min: 5, max: 200, step: 1 },
  foreperiod_min_ms: { min: 200, max: 5000, step: 100 },
  foreperiod_max_ms: { min: 200, max: 10000, step: 100 },
  timeout_ms: { min: 300, max: 5000, step: 100 },
  anticipation_threshold_ms: { min: 0, max: 300, step: 10 },
  mu_ms: { min: 100, max: 800, step: 10 },
  sigma_ms: { min: 1, max: 200, step: 1 },
  tau_ms: { min: 1, max: 400, step: 1 },
  practice_slope_ms_per_trial: { min: -5, max: 5, step: 0.1 },
} as const;

export const FEEDBACK_MS = 700;
