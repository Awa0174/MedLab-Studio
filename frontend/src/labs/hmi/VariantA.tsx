import { useState } from "react";
import type { HmiTaskSpec } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ALARM_LABELS, FIELD_LABELS, FIELD_UNITS } from "@/labs/hmi/defaults";
import { parseLegacyNumber } from "@/labs/hmi/schedule";
import type { Submission } from "@/labs/hmi/types";

const FIELDS = ["rate", "vtbi", "bolus"] as const;
type Field = (typeof FIELDS)[number];

interface Props {
  task: HmiTaskSpec;
  /** Unit selectors keep their last setting across tasks (a known legacy-device trait). */
  stickyUnits: Record<Field, string>;
  alarmOrder: string[];
  onInteract: () => void;
  onSubmit: (s: Submission, units: Record<Field, string>) => void;
}

/**
 * Variant A: a classic "all settings on one screen" form. Free-text entry, the unit
 * selector remembers its previous value, a comma is silently dropped on parsing, and
 * alarms are acknowledged through generic numbered buttons.
 */
export function VariantA({ task, stickyUnits, alarmOrder, onInteract, onSubmit }: Props) {
  const [values, setValues] = useState<Record<Field, string>>({ rate: "", vtbi: "", bolus: "" });
  const [units, setUnits] = useState<Record<Field, string>>(stickyUnits);
  const [lastEdited, setLastEdited] = useState<Field | null>(null);

  const apply = () => {
    const field = lastEdited;
    if (!field) {
      onSubmit(
        { submitted_field: null, submitted_value: null, submitted_unit: null, raw_text: "" },
        units,
      );
      return;
    }
    onSubmit(
      {
        submitted_field: field,
        submitted_value: parseLegacyNumber(values[field]),
        submitted_unit: units[field],
        raw_text: values[field],
      },
      units,
    );
  };

  return (
    <div
      className="bg-surface-3 border-border-strong mx-auto w-full max-w-md rounded border p-3 font-mono text-xs"
      data-testid="variant-a"
    >
      <div className="text-muted mb-2 flex items-center justify-between">
        <span>PUMP 2000 · SETTINGS</span>
        <span>CH 1</span>
      </div>
      <table className="w-full border-separate border-spacing-y-1">
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f}>
              <td className="text-muted w-14 pr-2">{FIELD_LABELS[f]}</td>
              <td>
                <input
                  aria-label={`${FIELD_LABELS[f]} value`}
                  className="bg-surface border-border-strong h-7 w-full rounded-sm border px-1.5"
                  value={values[f]}
                  onChange={(e) => {
                    onInteract();
                    setValues((v) => ({ ...v, [f]: e.target.value }));
                    setLastEdited(f);
                  }}
                />
              </td>
              <td className="pl-1">
                <select
                  aria-label={`${FIELD_LABELS[f]} unit`}
                  className="bg-surface border-border-strong h-7 rounded-sm border px-1"
                  value={units[f]}
                  onChange={(e) => {
                    onInteract();
                    setUnits((u) => ({ ...u, [f]: e.target.value }));
                  }}
                >
                  {FIELD_UNITS[f]!.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {alarmOrder.map((id, i) => (
            <button
              key={id}
              type="button"
              className="bg-surface border-border-strong hover:bg-surface-2 rounded-sm border px-1.5 py-1 text-[10px]"
              title={ALARM_LABELS[id]}
              onClick={() => {
                onInteract();
                onSubmit({ submitted_alarm: id, raw_text: `alarm ${i + 1}` }, units);
              }}
            >
              ALM {i + 1} OK
              <span className="text-faint block text-[8px] leading-none">{ALARM_LABELS[id]}</span>
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={apply} data-testid="variant-a-apply">
          Apply
        </Button>
      </div>
      <p className="text-faint mt-2 text-[10px]">task: {task.instruction}</p>
    </div>
  );
}
