"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface FABSubAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface FABExpandableProps {
  actions: FABSubAction[];
  className?: string;
  "data-tour"?: string;
}

export function FABExpandable({ actions, className, "data-tour": dataTour }: Readonly<FABExpandableProps>) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <>
      {/* Overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-default"
          onClick={close}
          aria-label={tc("closeOverlay")}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      {/* Sub-actions */}
      <div
        className="fixed right-4 z-50 flex flex-col-reverse items-end gap-3"
        style={{
          bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 80px)",
        }}
      >
        {open &&
          actions.map((action, i) => (
            <div
              key={`action-${action.label}`}
              className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span
                className="glass text-[12px] font-medium px-3 py-1.5 rounded-full"
                style={{ color: "var(--text-primary)" }}
              >
                {action.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  close();
                  action.onClick();
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{
                  backgroundColor: action.color ?? "var(--color-brand)",
                  boxShadow: "var(--shadow-md)",
                }}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            </div>
          ))}
      </div>

      {/* Main FAB */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "fixed right-4 z-50 rounded-full flex items-center justify-center",
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
        aria-label={open ? tc("close") : tc("add")}
        aria-expanded={open}
        {...(dataTour ? { "data-tour": dataTour } : {})}
      >
        {open ? (
          <X className="w-6 h-6 text-white" strokeWidth={2.5} />
        ) : (
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        )}
      </button>
    </>
  );
}
