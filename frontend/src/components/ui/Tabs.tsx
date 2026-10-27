import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "bg-surface-2 border-border inline-flex h-8 items-center rounded-md border p-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "text-muted data-[state=active]:bg-surface data-[state=active]:text-fg-strong h-full rounded px-3 text-xs font-medium transition-colors data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
