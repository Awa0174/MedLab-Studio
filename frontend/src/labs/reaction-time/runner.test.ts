import { describe, expect, it } from "vitest";
import {
  anticipationDuringForeperiod,
  evaluateResponse,
  keyToResponse,
  planTrials,
  timeoutTrial,
} from "@/labs/reaction-time/runner";
import { DEFAULT_DESIGN } from "@/labs/reaction-time/defaults";

describe("reaction-time runner helpers", () => {
  it("plans seeded foreperiods inside the configured range", () => {
    const a = planTrials({ ...DEFAULT_DESIGN, n_trials: 50, seed: 7 });
    const b = planTrials({ ...DEFAULT_DESIGN, n_trials: 50, seed: 7 });
    const c = planTrials({ ...DEFAULT_DESIGN, n_trials: 50, seed: 8 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(50);
    for (const p of a) {
      expect(p.foreperiod_ms).toBeGreaterThanOrEqual(DEFAULT_DESIGN.foreperiod_min_ms);
      expect(p.foreperiod_ms).toBeLessThanOrEqual(DEFAULT_DESIGN.foreperiod_max_ms);
      expect(p.side).toBe("simple");
    }
  });

  it("assigns both sides in a choice task", () => {
    const plans = planTrials({ ...DEFAULT_DESIGN, task: "choice", n_trials: 40 });
    const sides = new Set(plans.map((p) => p.side));
    expect(sides).toEqual(new Set(["left", "right"]));
  });

  it("maps keys per task", () => {
    expect(keyToResponse(" ", "simple")).toBe("space");
    expect(keyToResponse("ArrowLeft", "simple")).toBeNull();
    expect(keyToResponse("ArrowLeft", "choice")).toBe("left");
    expect(keyToResponse("ArrowRight", "choice")).toBe("right");
    expect(keyToResponse("a", "choice")).toBeNull();
  });

  it("evaluates responses, anticipations and timeouts", () => {
    const plan = { index: 3, foreperiod_ms: 1500, side: "left" as const };
    const design = { ...DEFAULT_DESIGN, task: "choice" as const };
    const ok = evaluateResponse(plan, design, 312.3456, "left");
    expect(ok).toMatchObject({ index: 3, reaction_ms: 312.346, correct: true, anticipated: false });
    const wrong = evaluateResponse(plan, design, 300, "right");
    expect(wrong.correct).toBe(false);
    const early = evaluateResponse(plan, design, 60, "left");
    expect(early.anticipated).toBe(true);
    expect(anticipationDuringForeperiod(plan, "left")).toMatchObject({
      anticipated: true,
      reaction_ms: 0,
    });
    expect(timeoutTrial(plan)).toMatchObject({
      timed_out: true,
      reaction_ms: null,
      correct: false,
    });
  });
});
