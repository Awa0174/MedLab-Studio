import { Link } from "react-router";
import { LABS, labPath } from "@/labs/registry";
import type { LabInfo } from "@/labs/registry";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

export function DashboardPage() {
  const available = LABS.filter((l) => l.status === "available").length;
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-fg-strong text-2xl font-semibold tracking-tight">
            Laboratory overview
          </h1>
          <p className="text-muted mt-1 max-w-2xl text-sm">
            Ten specialised laboratories on one experiment infrastructure. Each experiment records
            its model version, parameters with units, random seed and validation checks so results
            can be saved, repeated and compared.
          </p>
        </div>
        <div className="text-muted flex gap-4 text-xs">
          <Stat label="labs" value={LABS.length} />
          <Stat label="available" value={available} />
          <Stat label="planned" value={LABS.length - available} />
        </div>
      </div>
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Laboratories"
      >
        {LABS.map((lab) => (
          <li key={lab.id}>
            <LabCard lab={lab} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-fg-strong tabular font-mono text-lg leading-none">{value}</span>
      <span className="text-faint text-[10px] tracking-wider uppercase">{label}</span>
    </div>
  );
}

function LabCard({ lab }: { lab: LabInfo }) {
  const planned = lab.status === "planned";
  return (
    <Link
      to={labPath(lab)}
      data-testid={`lab-card-${lab.id}`}
      className={cn(
        "bg-surface border-border rounded-panel group flex h-full flex-col gap-3 border p-4 transition-colors",
        "hover:border-border-strong focus-visible:border-accent",
        planned && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-faint font-mono text-xs">{String(lab.number).padStart(2, "0")}</span>
        <Badge tone={planned ? "neutral" : "ok"}>
          {planned ? `planned · phase ${lab.phase}` : "available"}
        </Badge>
      </div>
      <div>
        <h2 className="text-fg-strong group-hover:text-accent text-base font-semibold transition-colors">
          {lab.name}
        </h2>
        <p className="text-muted mt-1 text-sm leading-snug">{lab.description}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {lab.domains.map((d) => (
          <span key={d} className="text-faint bg-surface-2 rounded px-1.5 py-0.5 text-[11px]">
            {d}
          </span>
        ))}
      </div>
    </Link>
  );
}
