"use client";

import { Children, isValidElement, useState } from "react";
import { cn } from "@/lib/utils";

export function TabPanel({
  children,
}: {
  tabKey: string;
  label: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultTab);

  const panels = Children.toArray(children).filter(isValidElement) as React.ReactElement<{
    tabKey: string;
    label: string;
    children: React.ReactNode;
  }>[];
  const activePanel = panels.find((panel) => panel.props.tabKey === active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {panels.map((panel) => (
          <button
            key={panel.props.tabKey}
            type="button"
            onClick={() => setActive(panel.props.tabKey)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              active === panel.props.tabKey
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {panel.props.label}
          </button>
        ))}
      </div>

      {activePanel}
    </div>
  );
}
