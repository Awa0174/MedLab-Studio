import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      className={cn("border-border border-b last:border-b-0", className)}
    >
      <CollapsiblePrimitive.Trigger className="text-fg hover:bg-surface-2 flex w-full items-center justify-between gap-2 px-1 py-2 text-left text-xs font-semibold">
        <span>{title}</span>
        <span className={cn("text-faint transition-transform", open && "rotate-90")} aria-hidden>
          ›
        </span>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="text-muted px-1 pb-3 text-xs leading-relaxed">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
