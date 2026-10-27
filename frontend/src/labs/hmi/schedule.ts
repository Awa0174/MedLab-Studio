/** Pure scheduling helpers of the HMI runner (unit-tested without React). */
import type { HmiDesign, HmiTaskSpec, HmiVariant } from "@/api/client";
import { mulberry32, shuffle } from "@/lib/prng";

export interface ScheduledTask {
  variant: HmiVariant;
  orderIndex: number;
  task: HmiTaskSpec;
}

export type ScheduleStep =
  { kind: "task"; item: ScheduledTask } | { kind: "tlx"; variant: HmiVariant } | { kind: "done" };

/** Both variants see the same task set, each in its own seeded order, then rate load. */
export function buildSchedule(design: HmiDesign, tasks: HmiTaskSpec[]): ScheduleStep[] {
  const order: HmiVariant[] = design.variant_order === "AB" ? ["A", "B"] : ["B", "A"];
  const steps: ScheduleStep[] = [];
  order.forEach((variant, vi) => {
    const rand = mulberry32(design.seed * 31 + vi + 1);
    shuffle(tasks, rand).forEach((task, orderIndex) => {
      steps.push({ kind: "task", item: { variant, orderIndex, task } });
    });
    steps.push({ kind: "tlx", variant });
  });
  steps.push({ kind: "done" });
  return steps;
}

/** Variant A parses free text the way many legacy devices do: a comma is dropped. */
export function parseLegacyNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Variant B keypad input: comma and dot both mean the decimal point. */
export function parseGuardedNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
