import { NavLink } from "react-router";
import { LABS, labPath } from "@/labs/registry";
import { cn } from "@/components/ui/cn";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
    isActive ? "bg-surface-3 text-fg-strong" : "text-muted hover:bg-surface-2 hover:text-fg",
  );
}

export function Sidebar() {
  return (
    <aside
      className="bg-surface border-border hidden w-60 shrink-0 flex-col border-r md:flex"
      aria-label="Laboratory navigation"
    >
      <div className="border-border border-b px-4 py-3">
        <div className="text-fg-strong text-sm font-bold tracking-[0.18em] uppercase">
          MedLab Studio
        </div>
        <div className="text-faint mt-0.5 text-[11px] tracking-wider uppercase">
          Local workspace · v0.1
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <SectionLabel>Laboratory</SectionLabel>
        <NavLink to="/" end className={navClass}>
          <span className="text-faint w-5 text-center font-mono text-[11px]">▦</span>
          Overview
        </NavLink>
        {LABS.map((lab) => (
          <NavLink key={lab.id} to={labPath(lab)} className={navClass}>
            <span className="text-faint w-5 text-center font-mono text-[11px]">
              {String(lab.number).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate">{lab.name}</span>
            {lab.status === "planned" ? (
              <span className="bg-surface-3 text-faint rounded px-1 text-[9px] tracking-wider uppercase">
                plan
              </span>
            ) : (
              <span className="bg-ok h-1.5 w-1.5 rounded-full" aria-label="available" />
            )}
          </NavLink>
        ))}
        <SectionLabel className="mt-4">Workspace</SectionLabel>
        <NavLink to="/experiments" className={navClass}>
          <span className="text-faint w-5 text-center font-mono text-[11px]">≡</span>
          Experiments
        </NavLink>
      </nav>
    </aside>
  );
}

function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-faint px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}
