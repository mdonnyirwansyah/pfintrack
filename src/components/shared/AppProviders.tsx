"use client";

import { useEffect, useState } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "@/components/ui/sonner";
import { getOrCreateAnonId } from "@/lib/bootstrap/anon-id";
import { useAppStore } from "@/lib/stores/useAppStore";
import { setFormatDecimals } from "@/lib/format/number";
import { runStorageMigration, isMigrationDone } from "@/lib/storage/migrate-from-localstorage";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const setAnonId = useAppStore((s) => s.setAnonId);
  const setHydrated = useAppStore((s) => s.setHydrated);
  const showDecimals = useAppStore((s) => s.showDecimals);

  // Start as true so the initial client render matches the server HTML (avoids hydration mismatch).
  // useEffect then checks if migration is still needed and flips to false until it completes.
  const [migrationReady, setMigrationReady] = useState(true);

  useEffect(() => {
    if (isMigrationDone()) return;
    setMigrationReady(false);
    runStorageMigration().then(() => setMigrationReady(true));
  }, []);

  useEffect(() => {
    if (navigator.storage?.persist) void navigator.storage.persist();
  }, []);

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
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
    >
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
    </SerwistProvider>
  );
}
