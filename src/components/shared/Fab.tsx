"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
  className?: string;
  "aria-label": string;
  "data-tour"?: string;
}

export function Fab({ onClick, className, "aria-label": ariaLabel, "data-tour": dataTour }: Readonly<FabProps>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-0 right-4 z-50 rounded-full flex items-center justify-center",
        "transition-transform active:scale-95",
        className
      )}
      style={{
        width: "var(--fab-size)",
        height: "var(--fab-size)",
        bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px)",
        backgroundColor: "var(--color-brand)",
        boxShadow: "var(--shadow-fab)",
      }}
      aria-label={ariaLabel}
      {...(dataTour ? { "data-tour": dataTour } : {})}
    >
      <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
    </button>
  );
}
