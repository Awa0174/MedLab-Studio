import { describe, expect, it } from "vitest";
import { buildSchedule, parseGuardedNumber, parseLegacyNumber } from "@/labs/hmi/schedule";
import { DEFAULT_HMI_DESIGN } from "@/labs/hmi/defaults";
import type { HmiTaskSpec } from "@/api/client";

const tasks: HmiTaskSpec[] = ["t01", "t02", "t03", "t04"].map((id, i) => ({
  id,
  kind: (["set_rate", "set_vtbi", "set_bolus", "ack_alarm"] as const)[i]!,
  instruction: id,
  target_field: "rate",
  target_value: 1,
  unit: "mL/h",
  tolerance: 0.001,
  min_value: 0,
  max_value: 10,
  alarm_id: null,
}));

describe("HMI schedule", () => {
  it("runs every task once per variant in seeded order, then TLX, then done", () => {
    const steps = buildSchedule({ ...DEFAULT_HMI_DESIGN, seed: 3 }, tasks);
    const kinds = steps.map((s) => s.kind);
    expect(kinds.filter((k) => k === "task")).toHaveLength(8);
    expect(kinds.filter((k) => k === "tlx")).toHaveLength(2);
    expect(kinds[kinds.length - 1]).toBe("done");
    expect(kinds[4]).toBe("tlx");
    const first = steps.slice(0, 4).map((s) => (s.kind === "task" ? s.item : null));
    expect(first.every((s) => s?.variant === "A")).toBe(true);
    expect(new Set(first.map((s) => s?.task.id))).toEqual(new Set(tasks.map((t) => t.id)));
    expect(buildSchedule({ ...DEFAULT_HMI_DESIGN, seed: 3 }, tasks)).toEqual(steps);
  });

  it("respects the variant order BA", () => {
    const steps = buildSchedule({ ...DEFAULT_HMI_DESIGN, variant_order: "BA" }, tasks);
    expect(steps[0]).toMatchObject({ kind: "task", item: { variant: "B" } });
  });

  it("parses numbers the way each variant does", () => {
    expect(parseLegacyNumber("12,5")).toBe(125);
    expect(parseLegacyNumber("12.5")).toBe(12.5);
    expect(parseLegacyNumber("")).toBeNull();
    expect(parseLegacyNumber("abc")).toBeNull();
    expect(parseGuardedNumber("12,5")).toBe(12.5);
    expect(parseGuardedNumber(".")).toBeNull();
  });
});
