"use client";

import { formatIDR } from "@/lib/format/number";

interface LoanSummaryBarProps {
  totalGet: number;
  totalGive: number;
}

/**
 * Summary bar untuk halaman utama Loan.
 * - Give: uang yang Anda keluarkan — tampil tanpa tanda
 * - Get:  uang yang akan kembali ke Anda — tampil dengan "+" jika > 0
 * - Balance: net (Give − Get), tanpa tanda jika 0
 */
export function LoanSummaryBar({ totalGet, totalGive }: LoanSummaryBarProps) {
  const balance = totalGive - totalGet;

  const getPrefix = totalGet > 0 ? "+ " : "";
  // balance < 0 berarti Get > Give (kelebihan bayar) → tampilkan "+ Rp X"
  // balance > 0 berarti masih ada piutang → tanpa tanda
  const balancePrefix = balance < 0 ? "+ " : "";
  const balanceDisplay = Math.abs(balance);

  return (
    <div
      className="flex rounded-[16px] overflow-hidden mb-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Get column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-accent-warm)" }}
        >
          Get
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-accent-warm)" }}
        >
          {getPrefix}{formatIDR(totalGet)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      {/* Give column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-negative)" }}
        >
          Give
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-negative)" }}
        >
          {formatIDR(totalGive)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      {/* Balance column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "#E91E8C" }}
        >
          Balance
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "#E91E8C" }}
        >
          {balancePrefix}{formatIDR(balanceDisplay)}
        </span>
      </div>
    </div>
  );
}
