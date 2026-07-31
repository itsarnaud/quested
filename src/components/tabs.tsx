"use client";

import { Children, isValidElement, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border">
        {panels.map((panel) => (
          <button
            key={panel.props.tabKey}
            type="button"
            onClick={() => setActive(panel.props.tabKey)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
              active === panel.props.tabKey
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {panel.props.label}
            {active === panel.props.tabKey ? (
              <motion.div
                layoutId="tabs-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {activePanel}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
