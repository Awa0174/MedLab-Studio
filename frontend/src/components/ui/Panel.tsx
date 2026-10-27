import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("bg-surface border-border rounded-panel flex flex-col border", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-border flex items-center gap-3 border-b px-4 py-2.5", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-fg-strong truncate text-[13px] font-semibold tracking-wide uppercase">
          {title}
        </h2>
        {subtitle ? <p className="text-muted truncate text-xs">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 p-4", className)} {...props} />;
}
