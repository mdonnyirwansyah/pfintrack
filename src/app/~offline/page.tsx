"use client";

import { WifiOff, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

const MODULES = [
  { href: "/transactions", label: "Transaksi" },
  { href: "/wallet",       label: "Dompet"    },
  { href: "/loan",         label: "Pinjaman"  },
  { href: "/report",       label: "Laporan"   },
  { href: "/settings",     label: "Pengaturan"},
];

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="glass rounded-[24px] p-6 w-full max-w-xs space-y-5">

        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-2">
          <WifiOff
            className="w-12 h-12"
            style={{ color: "var(--text-tertiary)" }}
          />
          <h2
            className="text-[15px] font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Kamu sedang offline
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Halaman yang tersimpan masih bisa dibuka.
          </p>
        </div>

        {/* Module links */}
        <div className="space-y-1.5">
          {MODULES.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-2.5 rounded-[12px] transition-opacity active:opacity-60"
              style={{
                background: "var(--bg-secondary)",
                minHeight: "var(--tap-target-min)",
              }}
            >
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {label}
              </span>
              <ArrowRight
                className="w-4 h-4"
                style={{ color: "var(--text-tertiary)" }}
              />
            </Link>
          ))}
        </div>

        {/* Retry button */}
        <button
          onClick={() => globalThis.location.reload()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-[13px] font-semibold transition-opacity active:opacity-70"
          style={{
            background: "var(--color-brand)",
            color: "var(--text-on-primary)",
            minHeight: "var(--tap-target-min)",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>

      </div>
    </div>
  );
}
