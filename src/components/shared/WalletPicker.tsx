"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Wallet } from "@/lib/types/wallet";

interface WalletPickerProps {
  open: boolean;
  onClose: () => void;
  wallets: Wallet[];
  selectedWalletId?: string;
  onSelect: (wallet: Wallet) => void;
}

export function WalletPicker({
  open,
  onClose,
  wallets,
  selectedWalletId,
  onSelect,
}: WalletPickerProps) {
  const activeWallets = wallets.filter((w) => w.is_active);

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent
        className="glass-strong"
        style={{ borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}
      >
        <DrawerHeader
          className="border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <DrawerTitle
            className="text-[17px] font-semibold text-left"
            style={{ color: "var(--text-primary)" }}
          >
            Select Wallet
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4 pb-8" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          {activeWallets.length === 0 ? (
            <p className="text-center text-[15px] py-8" style={{ color: "var(--text-tertiary)" }}>
              No wallets available
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {activeWallets.map((wallet) => {
                const isSelected = wallet.id === selectedWalletId;
                return (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      onSelect(wallet);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-[16px] transition-all active:scale-95"
                    style={{
                      minHeight: "var(--tap-target-min)",
                      background: isSelected
                        ? "var(--color-brand-soft)"
                        : "var(--bg-secondary)",
                      border: `1px solid ${isSelected ? "var(--color-brand)" : "var(--border-default)"}`,
                    }}
                  >
                    <span
                      className="text-[13px] font-medium text-center leading-tight"
                      style={{
                        color: isSelected
                          ? "var(--color-brand)"
                          : "var(--text-primary)",
                      }}
                    >
                      {wallet.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
