import type { ReactNode } from "react";

export function Metric({
  label,
  value,
  unit,
  accent,
  title,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
  title?: string;
}) {
  return (
    <div className="bg-surface-2 rounded-md px-2.5 py-1.5" title={title}>
      <dt className="text-faint text-[10px] tracking-wider uppercase">{label}</dt>
      <dd className={`tabular font-mono text-sm ${accent ? "text-accent" : "text-fg-strong"}`}>
        {value}
        {unit ? <span className="text-faint ml-1 text-[10px]">{unit}</span> : null}
      </dd>
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</dl>;
}
