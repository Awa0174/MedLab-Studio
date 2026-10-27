/** Imperative HMI session runner, independent of React. */
import type {
  HmiDesign,
  HmiTaskResult,
  HmiTaskSpec,
  HmiVariant,
  TimingInfo,
  TlxRating,
} from "@/api/client";
import { measureTiming } from "@/lib/timing";
import { mulberry32, shuffle } from "@/lib/prng";
import { buildSchedule } from "@/labs/hmi/schedule";
import type { ScheduleStep } from "@/labs/hmi/schedule";
import type { Submission } from "@/labs/hmi/types";

export interface HmiRunnerState {
  phase: "idle" | "measuring" | "running" | "done";
  stepIndex: number;
  step: ScheduleStep | null;
  completed: number;
  total: number;
}

const INITIAL: HmiRunnerState = { phase: "idle", stepIndex: 0, step: null, completed: 0, total: 0 };

export type HmiCompleteHandler = (
  results: HmiTaskResult[],
  tlx: Partial<Record<HmiVariant, TlxRating>>,
  timing: TimingInfo,
  tasks: HmiTaskSpec[],
) => void;

export class HmiEngine {
  private state: HmiRunnerState = INITIAL;
  private listeners = new Set<() => void>();
  private design: HmiDesign | null = null;
  private tasks: HmiTaskSpec[] = [];
  private onComplete: HmiCompleteHandler | null = null;
  private schedule: ScheduleStep[] = [];
  private results: HmiTaskResult[] = [];
  private tlx: Partial<Record<HmiVariant, TlxRating>> = {};
  private timing: TimingInfo | null = null;
  private taskStart = 0;
  private interactions = 0;
  private timer: number | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): HmiRunnerState => this.state;

  configure(design: HmiDesign, tasks: HmiTaskSpec[] | undefined, onComplete: HmiCompleteHandler) {
    this.design = design;
    this.tasks = tasks ?? [];
    this.onComplete = onComplete;
  }

  private set(patch: Partial<HmiRunnerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private clearTimer() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  async start() {
    if (!this.design || this.tasks.length === 0) return;
    this.results = [];
    this.tlx = {};
    this.schedule = buildSchedule(this.design, this.tasks);
    const total = this.schedule.filter((s) => s.kind === "task").length;
    this.set({ ...INITIAL, phase: "measuring", total });
    this.timing = await measureTiming(20);
    this.goto(0);
  }

  abort() {
    this.clearTimer();
    this.set(INITIAL);
  }

  dispose() {
    this.clearTimer();
    this.listeners.clear();
  }

  interact = () => {
    this.interactions += 1;
  };

  private goto(i: number) {
    this.clearTimer();
    const step = this.schedule[i] ?? { kind: "done" as const };
    if (step.kind === "done") {
      this.set({ phase: "done", stepIndex: i, step });
      this.onComplete?.(this.results, this.tlx, this.timing ?? { method: "unknown" }, this.tasks);
      return;
    }
    if (step.kind === "task" && this.design) {
      this.taskStart = performance.now();
      this.interactions = 0;
      this.timer = window.setTimeout(
        () => this.submit({ raw_text: null }, true),
        this.design.timeout_ms,
      );
    }
    this.set({ phase: "running", stepIndex: i, step });
  }

  submit = (s: Submission, timedOut = false) => {
    const step = this.schedule[this.state.stepIndex];
    if (!step || step.kind !== "task") return;
    this.clearTimer();
    this.results = [
      ...this.results,
      {
        task_id: step.item.task.id,
        variant: step.item.variant,
        order_index: step.item.orderIndex,
        duration_ms: Number((performance.now() - this.taskStart).toFixed(3)),
        submitted_field: s.submitted_field ?? null,
        submitted_value: s.submitted_value ?? null,
        submitted_unit: s.submitted_unit ?? null,
        submitted_alarm: s.submitted_alarm ?? null,
        raw_text: s.raw_text ?? null,
        interactions: this.interactions,
        confirmed: !timedOut,
        timed_out: timedOut,
      },
    ];
    this.set({ completed: this.state.completed + 1 });
    this.goto(this.state.stepIndex + 1);
  };

  rateTlx = (variant: HmiVariant, rating: TlxRating) => {
    this.tlx = { ...this.tlx, [variant]: rating };
    this.goto(this.state.stepIndex + 1);
  };

  /** Alarm button order for variant A, shuffled per task from the seed. */
  alarmOrder = (taskId: string): string[] => {
    const seed = (this.design?.seed ?? 0) + Number(taskId.replace(/\D/g, "")) * 7919;
    return shuffle(["occlusion", "air_in_line", "battery_low", "door_open"], mulberry32(seed));
  };
}
