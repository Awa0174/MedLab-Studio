/**
 * Form controls for scientific parameters. Every numeric control shows its unit and
 * is operable by keyboard (Radix slider arrows, native number input).
 */
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as Label from "@radix-ui/react-label";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

interface BaseFieldProps {
  label: string;
  unit?: string;
  hint?: string;
  className?: string;
}

export function FieldRow({
  label,
  unit,
  hint,
  htmlFor,
  children,
  className,
}: BaseFieldProps & { htmlFor?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label.Root htmlFor={htmlFor} className="text-fg text-xs font-medium">
          {label}
        </Label.Root>
        {unit ? (
          <span className="text-faint font-mono text-[11px]" aria-hidden>
            {unit}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-faint text-[11px] leading-snug">{hint}</p> : null}
    </div>
  );
}

export interface SliderFieldProps extends BaseFieldProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  decimals?: number;
}

/** Slider plus editable number box. The number box commits on blur or Enter. */
export function SliderField({
  label,
  unit,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  decimals,
  className,
}: SliderFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // Re-sync the text box when the committed value changes from outside (slider, reset, load).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(String(value));
  }

  const commit = () => {
    const parsed = Number(text.replace(",", "."));
    if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    else setText(String(value));
  };

  return (
    <FieldRow label={label} unit={unit} hint={hint} htmlFor={id} className={className}>
      <div className="flex items-center gap-3">
        <SliderPrimitive.Root
          className="relative flex h-5 flex-1 touch-none items-center select-none"
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={([v]) => v !== undefined && onChange(v)}
          aria-label={label}
        >
          <SliderPrimitive.Track className="bg-surface-3 relative h-1 grow rounded-full">
            <SliderPrimitive.Range className="bg-accent absolute h-full rounded-full" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="bg-fg-strong border-accent block h-3.5 w-3.5 rounded-full border-2 shadow transition-transform hover:scale-110 focus-visible:scale-110" />
        </SliderPrimitive.Root>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="bg-surface-2 border-border text-fg tabular h-7 w-[4.5rem] rounded-md border px-2 text-right font-mono text-xs"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`${label} value${unit ? ` in ${unit}` : ""}`}
          data-decimals={decimals}
        />
      </div>
    </FieldRow>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <Label.Root htmlFor={id} className="text-fg block text-xs font-medium">
          {label}
        </Label.Root>
        {hint ? <p className="text-faint text-[11px] leading-snug">{hint}</p> : null}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="bg-surface-3 data-[state=checked]:bg-accent relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50"
      >
        <SwitchPrimitive.Thumb className="bg-fg-strong block h-4 w-4 translate-x-0.5 rounded-full shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectField<T extends string>({
  label,
  unit,
  hint,
  value,
  options,
  onChange,
  disabled,
  className,
}: BaseFieldProps & {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FieldRow label={label} unit={unit} hint={hint} htmlFor={id} className={className}>
      <SelectPrimitive.Root
        value={value}
        onValueChange={(v) => onChange(v as T)}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          className="bg-surface-2 border-border text-fg flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-xs disabled:opacity-50"
          aria-label={label}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className="text-faint ml-2">▾</SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="bg-surface border-border z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border p-1 shadow-lg"
          >
            <SelectPrimitive.Viewport>
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="text-fg data-[highlighted]:bg-surface-2 data-[state=checked]:text-accent cursor-default rounded px-2 py-1.5 text-xs outline-none select-none"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FieldRow>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline,
  className,
  autoFocus,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const common =
    "bg-surface-2 border-border text-fg w-full rounded-md border px-2.5 py-1.5 text-sm placeholder:text-faint";
  return (
    <FieldRow label={label} hint={hint} htmlFor={id} className={className}>
      {multiline ? (
        <textarea
          id={id}
          className={cn(common, "min-h-[4.5rem] resize-y")}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={cn(common, "h-8")}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldRow>
  );
}
