"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getOrCreateAnonId } from "@/lib/bootstrap/anon-id";
import { useAppStore } from "@/lib/stores/useAppStore";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const setAnonId = useAppStore((s) => s.setAnonId);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    // Bootstrap: ensure anon_id exists in localStorage
    const id = getOrCreateAnonId();
    setAnonId(id);
    setHydrated(true);
  }, [setAnonId, setHydrated]);

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
