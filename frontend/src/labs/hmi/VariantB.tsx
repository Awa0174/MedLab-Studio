import { useState } from "react";
import type { HmiTaskSpec } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ALARM_LABELS, FIELD_LABELS } from "@/labs/hmi/defaults";
import { parseGuardedNumber } from "@/labs/hmi/schedule";
import type { Submission } from "@/labs/hmi/types";

interface Props {
  task: HmiTaskSpec;
  onInteract: () => void;
  onSubmit: (s: Submission) => void;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "⌫"];

/**
 * Variant B: one task, one field. The unit is fixed and large, the allowed range is
 * shown, entry happens on a keypad, and a confirmation repeats the value before it is
 * applied. Alarms are acknowledged by name.
 */
export function VariantB({ task, onInteract, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const value = parseGuardedNumber(text);
  const outOfRange =
    value !== null &&
    task.min_value != null &&
    task.max_value != null &&
    (value < task.min_value || value > task.max_value);

  if (task.kind === "ack_alarm") {
    return (
      <div className="mx-auto w-full max-w-md" data-testid="variant-b">
        <div className="bg-danger/15 border-danger text-danger flex items-center gap-3 rounded-md border-2 p-3">
          <span className="text-2xl" aria-hidden>
            ⚠
          </span>
          <div className="flex-1">
            <div className="text-xs font-semibold tracking-wider uppercase">Alarm</div>
            <div className="text-fg-strong text-base font-semibold">
              {ALARM_LABELS[task.alarm_id ?? ""] ?? task.alarm_id}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              onInteract();
              onSubmit({ submitted_alarm: task.alarm_id ?? null, raw_text: "acknowledge" });
            }}
            data-testid="variant-b-ack"
          >
            Acknowledge {ALARM_LABELS[task.alarm_id ?? ""] ?? ""}
          </Button>
          <Button variant="secondary" onClick={onInteract}>
            Silence 2 min
          </Button>
        </div>
      </div>
    );
  }

  const label = FIELD_LABELS[task.target_field] ?? task.target_field;
  return (
    <div className="mx-auto w-full max-w-md" data-testid="variant-b">
      <div className="bg-surface-2 border-border rounded-md border p-3">
        <div className="text-muted text-[11px] tracking-wider uppercase">{label}</div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-fg-strong tabular min-h-10 font-mono text-3xl"
            aria-label={`${label} entry`}
            data-testid="variant-b-display"
          >
            {text || "–"}
          </span>
          <span className="text-accent font-mono text-lg">{task.unit}</span>
        </div>
        <div className={`text-[11px] ${outOfRange ? "text-danger" : "text-faint"}`}>
          allowed {task.min_value} – {task.max_value} {task.unit}
          {outOfRange ? " · out of range" : ""}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="bg-surface-2 border-border hover:bg-surface-3 h-10 rounded-md border font-mono text-base"
            aria-label={k === "⌫" ? "backspace" : k === "." ? "decimal point" : `digit ${k}`}
            onClick={() => {
              onInteract();
              setText((t) =>
                k === "⌫" ? t.slice(0, -1) : k === "." && t.includes(".") ? t : t + k,
              );
            }}
          >
            {k}
          </button>
        ))}
      </div>
      {confirming ? (
        <div
          className="bg-surface border-accent mt-3 rounded-md border-2 p-3"
          role="alertdialog"
          aria-label="Confirm value"
        >
          <div className="text-fg text-sm">
            Set {label.toLowerCase()} to{" "}
            <span className="text-fg-strong font-mono text-lg">
              {value} {task.unit}
            </span>
            ?
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onInteract();
                onSubmit({
                  submitted_field: task.target_field,
                  submitted_value: value,
                  submitted_unit: task.unit ?? null,
                  raw_text: text,
                });
              }}
              data-testid="variant-b-confirm"
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onInteract();
                setConfirming(false);
              }}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          className="mt-3 w-full"
          disabled={value === null || outOfRange}
          onClick={() => {
            onInteract();
            setConfirming(true);
          }}
          data-testid="variant-b-next"
        >
          Continue
        </Button>
      )}
    </div>
  );
}
