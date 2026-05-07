"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getOrCreateAnonId } from "@/lib/bootstrap/anon-id";
import { useAppStore } from "@/lib/stores/useAppStore";
import { setFormatDecimals } from "@/lib/format/number";
import { runStorageMigration, isMigrationDone } from "@/lib/storage/migrate-from-localstorage";
import { DemoBanner } from "./DemoBanner";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const setAnonId = useAppStore((s) => s.setAnonId);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const showDecimals = useAppStore((s) => s.showDecimals);

  // Lazy init: already-migrated users start as true (no loading flash).
  // First-time migration users start as false until runStorageMigration resolves.
  const [migrationReady, setMigrationReady] = useState(() => isMigrationDone());

  useEffect(() => {
    if (migrationReady) return;
    runStorageMigration().then(() => setMigrationReady(true));
  }, [migrationReady]);

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

  if (!migrationReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        closeButton
        duration={3000}
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
