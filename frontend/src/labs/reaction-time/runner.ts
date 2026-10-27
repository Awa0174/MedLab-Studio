/**
 * Pure helpers of the reaction-time runner, kept free of React so they can be unit-tested.
 */
import type { ReactionDesign, ReactionTrial } from "@/api/client";
import { mulberry32 } from "@/lib/prng";

export type Side = "left" | "right" | "simple";

export interface TrialPlan {
  index: number;
  foreperiod_ms: number;
  side: Side;
}

/** Foreperiods and stimulus sides for every trial, reproducible from the seed. */
export function planTrials(design: ReactionDesign): TrialPlan[] {
  const rand = mulberry32(design.seed);
  const plans: TrialPlan[] = [];
  for (let i = 0; i < design.n_trials; i++) {
    const foreperiod =
      design.foreperiod_min_ms + rand() * (design.foreperiod_max_ms - design.foreperiod_min_ms);
    const side: Side = design.task === "choice" ? (rand() < 0.5 ? "left" : "right") : "simple";
    plans.push({ index: i, foreperiod_ms: Math.round(foreperiod), side });
  }
  return plans;
}

export function keyToResponse(key: string, task: ReactionDesign["task"]): string | null {
  if (task === "simple") return key === " " || key === "Spacebar" ? "space" : null;
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

export function evaluateResponse(
  plan: TrialPlan,
  design: ReactionDesign,
  reactionMs: number,
  response: string,
): ReactionTrial {
  const anticipated = reactionMs < design.anticipation_threshold_ms;
  const correct = design.task === "simple" ? true : response === plan.side;
  return {
    index: plan.index,
    condition: plan.side,
    foreperiod_ms: plan.foreperiod_ms,
    reaction_ms: Number(reactionMs.toFixed(3)),
    response,
    correct,
    anticipated,
    timed_out: false,
  };
}

export function anticipationDuringForeperiod(plan: TrialPlan, response: string): ReactionTrial {
  return {
    index: plan.index,
    condition: plan.side,
    foreperiod_ms: plan.foreperiod_ms,
    reaction_ms: 0,
    response,
    correct: false,
    anticipated: true,
    timed_out: false,
  };
}

export function timeoutTrial(plan: TrialPlan): ReactionTrial {
  return {
    index: plan.index,
    condition: plan.side,
    foreperiod_ms: plan.foreperiod_ms,
    reaction_ms: null,
    response: null,
    correct: false,
    anticipated: false,
    timed_out: true,
  };
}
