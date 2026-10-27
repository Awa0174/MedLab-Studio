import type { HmiDesign, TlxRating } from "@/api/client";

export const DEFAULT_HMI_DESIGN: HmiDesign = {
  seed: 42,
  tasks_per_variant: 6,
  variant_order: "AB",
  timeout_ms: 60000,
  tasks: [],
};

export const DEFAULT_TLX: TlxRating = {
  mental: 50,
  physical: 20,
  temporal: 50,
  performance: 30,
  effort: 50,
  frustration: 30,
};

export const TLX_SCALES: { key: keyof TlxRating; label: string; low: string; high: string }[] = [
  { key: "mental", label: "Mental demand", low: "low", high: "high" },
  { key: "physical", label: "Physical demand", low: "low", high: "high" },
  { key: "temporal", label: "Temporal demand", low: "low", high: "high" },
  { key: "performance", label: "Performance", low: "perfect", high: "failure" },
  { key: "effort", label: "Effort", low: "low", high: "high" },
  { key: "frustration", label: "Frustration", low: "low", high: "high" },
];

export const FIELD_UNITS: Record<string, string[]> = {
  rate: ["mL/h", "mL/min"],
  vtbi: ["mL", "L"],
  bolus: ["mg", "mcg"],
};

export const FIELD_LABELS: Record<string, string> = {
  rate: "Rate",
  vtbi: "VTBI",
  bolus: "Bolus",
};

export const ALARM_LABELS: Record<string, string> = {
  occlusion: "Occlusion downstream",
  air_in_line: "Air in line",
  battery_low: "Battery low",
  door_open: "Door open",
};

export const VARIANT_INFO = {
  A: {
    name: "Variant A · classic form",
    description:
      "All three numeric fields on one screen, free-text entry, unit selectors that keep their last setting, a single Apply button and generic alarm buttons.",
  },
  B: {
    name: "Variant B · guarded entry",
    description:
      "One field per task with the unit fixed and visible, an on-screen keypad, the allowed range shown, and an explicit confirmation that repeats the value before it is applied. Alarms are acknowledged by name.",
  },
} as const;
