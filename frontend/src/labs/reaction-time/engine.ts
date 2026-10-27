/**
 * Imperative reaction-time block runner, independent of React.
 *
 * The stimulus element is toggled directly (no React render between timer and paint) and
 * the onset is stamped inside the requestAnimationFrame that precedes the frame showing it.
 */
import type { ReactionDesign, ReactionTrial, TimingInfo } from "@/api/client";
import { measureTiming } from "@/lib/timing";
import { FEEDBACK_MS } from "@/labs/reaction-time/defaults";
import {
  anticipationDuringForeperiod,
  evaluateResponse,
  keyToResponse,
  planTrials,
  timeoutTrial,
} from "@/labs/reaction-time/runner";
import type { Side, TrialPlan } from "@/labs/reaction-time/runner";

export type Phase = "idle" | "measuring" | "waiting" | "stimulus" | "feedback" | "done";

export interface RunnerState {
  phase: Phase;
  index: number;
  side: Side;
  lastTrial: ReactionTrial | null;
  trials: ReactionTrial[];
  timing: TimingInfo | null;
}

const INITIAL: RunnerState = {
  phase: "idle",
  index: 0,
  side: "simple",
  lastTrial: null,
  trials: [],
  timing: null,
};

type Listener = () => void;

export class ReactionEngine {
  private state: RunnerState = INITIAL;
  private listeners = new Set<Listener>();
  private element: HTMLElement | null = null;
  private design: ReactionDesign | null = null;
  private onComplete: ((trials: ReactionTrial[], timing: TimingInfo) => void) | null = null;
  private plans: TrialPlan[] = [];
  private trials: ReactionTrial[] = [];
  private timing: TimingInfo | null = null;
  private onset = 0;
  private timers: number[] = [];

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RunnerState => this.state;

  configure(
    design: ReactionDesign,
    onComplete: (trials: ReactionTrial[], timing: TimingInfo) => void,
  ) {
    this.design = design;
    this.onComplete = onComplete;
  }

  attach = (el: HTMLElement | null) => {
    this.element = el;
  };

  private set(patch: Partial<RunnerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private clearTimers() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }

  private hide() {
    this.element?.removeAttribute("data-on");
  }

  async start() {
    if (!this.design) return;
    this.clearTimers();
    this.trials = [];
    this.plans = planTrials(this.design);
    this.set({ ...INITIAL, phase: "measuring" });
    this.timing = await measureTiming();
    this.set({ timing: this.timing });
    this.startTrial(0);
  }

  abort() {
    this.clearTimers();
    this.hide();
    this.set({ phase: "idle", lastTrial: null });
  }

  dispose() {
    this.clearTimers();
    this.listeners.clear();
  }

  private startTrial(i: number) {
    const plan = this.plans[i];
    if (!plan || !this.design) {
      this.finish();
      return;
    }
    this.hide();
    this.set({ phase: "waiting", index: i, side: plan.side });
    const timeout = this.design.timeout_ms;
    const t = window.setTimeout(() => {
      this.element?.setAttribute("data-on", plan.side);
      requestAnimationFrame(() => {
        this.onset = performance.now();
        this.set({ phase: "stimulus" });
        const to = window.setTimeout(() => {
          if (this.state.phase === "stimulus") this.record(timeoutTrial(plan));
        }, timeout);
        this.timers.push(to);
      });
    }, plan.foreperiod_ms);
    this.timers.push(t);
  }

  private record(trial: ReactionTrial) {
    this.clearTimers();
    this.hide();
    this.trials = [...this.trials, trial];
    this.set({ phase: "feedback", lastTrial: trial, trials: this.trials });
    const t = window.setTimeout(() => this.startTrial(trial.index + 1), FEEDBACK_MS);
    this.timers.push(t);
  }

  private finish() {
    this.clearTimers();
    this.hide();
    this.set({ phase: "done", trials: this.trials });
    this.onComplete?.(this.trials, this.timing ?? { method: "unknown" });
  }

  handleKey = (e: KeyboardEvent) => {
    const { phase, index } = this.state;
    if (phase !== "waiting" && phase !== "stimulus") return;
    if (e.key === "Escape") {
      this.abort();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (!this.design) return;
    const response = keyToResponse(e.key, this.design.task);
    if (!response) return;
    e.preventDefault();
    const now = performance.now();
    const plan = this.plans[index];
    if (!plan) return;
    if (phase === "waiting") this.record(anticipationDuringForeperiod(plan, response));
    else this.record(evaluateResponse(plan, this.design, now - this.onset, response));
  };
}
