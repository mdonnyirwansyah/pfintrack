"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getOrCreateAnonId } from "@/lib/bootstrap/anon-id";
import { useAppStore } from "@/lib/stores/useAppStore";
import { setFormatDecimals } from "@/lib/format/number";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const setAnonId = useAppStore((s) => s.setAnonId);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const showDecimals = useAppStore((s) => s.showDecimals);

  useEffect(() => {
    // Bootstrap: ensure anon_id exists in localStorage
    const id = getOrCreateAnonId();
    setAnonId(id);
    setHydrated(true);
  }, [setAnonId, setHydrated]);

  // Sync decimal preference to the format module
  useEffect(() => {
    setFormatDecimals(showDecimals);
  }, [showDecimals]);

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-glass)",
            color: "var(--text-primary)",
          },
        }}
      />
    </>
  );
}
