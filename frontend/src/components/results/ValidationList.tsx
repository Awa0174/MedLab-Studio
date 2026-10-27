import type { ValidationCheck } from "@/api/client";
import { Badge } from "@/components/ui/Badge";

export function ValidationList({ checks }: { checks: ValidationCheck[] }) {
  const allPassed = checks.every((c) => c.passed);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-fg text-xs font-semibold">Validation checks</h3>
        <Badge tone={allPassed ? "ok" : "warn"}>{allPassed ? "all passed" : "attention"}</Badge>
      </div>
      <ul className="flex flex-col gap-1">
        {checks.map((c) => (
          <CheckRow key={c.name} check={c} />
        ))}
      </ul>
    </div>
  );
}

export function CheckRow({ check }: { check: ValidationCheck }) {
  const detail =
    check.expected !== null && check.expected !== undefined
      ? `expected ${check.expected}${check.tolerance ? ` ± ${check.tolerance}` : ""}, got ${check.actual ?? "–"}${check.unit ? ` ${check.unit}` : ""}`
      : "";
  return (
    <li className="flex items-start gap-2 text-xs" title={check.note ?? undefined}>
      <span
        className={`mt-0.5 font-mono ${check.passed ? "text-ok" : "text-danger"}`}
        aria-label={check.passed ? "passed" : "failed"}
      >
        {check.passed ? "✓" : "✗"}
      </span>
      <div className="min-w-0">
        <div className="text-fg">{check.name.replaceAll("_", " ")}</div>
        {detail ? <div className="text-faint tabular font-mono text-[11px]">{detail}</div> : null}
        {check.note ? <div className="text-faint text-[11px]">{check.note}</div> : null}
      </div>
    </li>
  );
}
