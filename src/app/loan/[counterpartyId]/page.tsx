"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FABExpandable } from "@/components/shared/FABExpandable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoanDetailSummaryBar } from "@/components/loan/LoanDetailSummaryBar";
import { LoanEntryListItem } from "@/components/loan/LoanEntryListItem";
import { useLoanCounterpartyStore, useLoanEntryStore } from "@/lib/stores/useLoanStore";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";

// [13] Loan Detail (entries list per counterparty)
export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ counterpartyId: string }>;
}) {
  const { counterpartyId } = use(params);
  const router = useRouter();

  const {
    counterparties,
    loadCounterparties,
    markAsPaid,
    renameCounterparty,
    deleteCounterparty,
    isNameTaken,
  } = useLoanCounterpartyStore();

  const { entries, loadEntriesForCounterparty } = useLoanEntryStore();

  const [isMarkAsPaidOpen, setIsMarkAsPaidOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editNameError, setEditNameError] = useState("");

  useEffect(() => {
    loadCounterparties();
    loadEntriesForCounterparty(counterpartyId);
  }, [counterpartyId, loadCounterparties, loadEntriesForCounterparty]);

  const counterparty = useMemo(
    () => counterparties.find((c) => c.id === counterpartyId) ?? null,
    [counterparties, counterpartyId]
  );

  // Aggregates
  const { totalGive, totalGet, outstanding } = useMemo(() => {
    const give = entries
      .filter((e) => e.type === "give")
      .reduce((s, e) => s + e.amount, 0);
    const get = entries
      .filter((e) => e.type === "get")
      .reduce((s, e) => s + e.amount, 0);
    return { totalGive: give, totalGet: get, outstanding: give - get };
  }, [entries]);

  const isPaidOff =
    counterparty?.manual_paid_off || outstanding === 0;

  // Sort entries: DESC by date+time, fallback ke created_at jika sama (resolusi menit)
  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const da = `${a.transaction_date}T${a.transaction_time}`;
        const db = `${b.transaction_date}T${b.transaction_time}`;
        const byDatetime = db.localeCompare(da);
        if (byDatetime !== 0) return byDatetime;
        // Tiebreaker: created_at (ISO dengan detik) — DESC
        return b.created_at.localeCompare(a.created_at);
      }),
    [entries]
  );

  // FAB actions: navigate to add forms with counterpartyId pre-filled
  const fabActions = [
    {
      label: "Give",
      icon: <TrendingDown className="w-5 h-5 text-white" />,
      color: "var(--color-negative)",
      onClick: () =>
        router.push(`/loan/add/give?counterpartyId=${counterpartyId}`),
    },
    {
      label: "Get",
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      color: "var(--color-accent-warm)",
      onClick: () =>
        router.push(`/loan/add/get?counterpartyId=${counterpartyId}`),
    },
  ];

  // Handle rename submit
  function handleRenameSubmit() {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      setEditNameError("Nama tidak boleh kosong");
      return;
    }
    if (trimmed.length < 2) {
      setEditNameError("Nama minimal 2 karakter");
      return;
    }
    if (trimmed.length > 50) {
      setEditNameError("Nama maksimal 50 karakter");
      return;
    }
    if (isNameTaken(trimmed, counterpartyId)) {
      setEditNameError("Nama sudah dipakai counterparty lain");
      return;
    }
    renameCounterparty(counterpartyId, trimmed);
    setIsEditNameOpen(false);
    setEditNameError("");
  }

  // Handle delete counterparty
  function handleDeleteCounterparty() {
    deleteCounterparty(counterpartyId);
    router.replace("/loan");
  }

  // If counterparty not found (maybe deleted or wrong ID)
  if (!counterparty) {
    return (
      <>
        <AppHeader title="Loan" showBack />
        <div className="px-4 py-8">
          <EmptyState
            icon={Users}
            title="Counterparty not found"
            description="This person may have been deleted."
          />
        </div>
      </>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1">
      {!isPaidOff && (
        <button
          onClick={() => setIsMarkAsPaidOpen(true)}
          className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
          style={{
            minWidth: "var(--tap-target-min)",
            minHeight: "var(--tap-target-min)",
            color: "var(--text-primary)",
          }}
          aria-label="Mark as paid"
        >
          <UserCheck className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={() => {
          setEditNameValue(counterparty.name);
          setEditNameError("");
          setIsEditNameOpen(true);
        }}
        className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
        style={{
          minWidth: "var(--tap-target-min)",
          minHeight: "var(--tap-target-min)",
          color: "var(--text-primary)",
        }}
        aria-label="Edit name"
      >
        <Pencil className="w-5 h-5" />
      </button>
      <button
        onClick={() => setIsDeleteOpen(true)}
        className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
        style={{
          minWidth: "var(--tap-target-min)",
          minHeight: "var(--tap-target-min)",
          color: "var(--color-negative)",
        }}
        aria-label="Delete counterparty"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <>
      <AppHeader
        title={counterparty.name}
        subtitle={isPaidOff ? "Paid off" : "Not paid off"}
        showBack
        actions={headerActions}
      />

      <div className="px-4 pt-4 pb-4">
        {/* Summary bar */}
        <LoanDetailSummaryBar
          totalGet={totalGet}
          totalGive={totalGive}
          outstanding={outstanding}
        />

        {/* Entry list */}
        {sortedEntries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No entries yet"
            description="Tap + to add a Give or Get entry"
          />
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => (
              <LoanEntryListItem
                key={entry.id}
                entry={entry}
                onClick={() =>
                  router.push(`/loan/${counterpartyId}/edit/${entry.id}`)
                }
              />
            ))}
          </div>
        )}
      </div>

      <FABExpandable actions={fabActions} />

      {/* Mark as paid confirmation */}
      <ConfirmDialog
        open={isMarkAsPaidOpen}
        onOpenChange={setIsMarkAsPaidOpen}
        title={`Mark ${counterparty.name} as paid off?`}
        description="This will close all outstanding loan records with this person. You can still add new transactions at any time."
        confirmLabel="Mark as Paid"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          markAsPaid(counterpartyId);
          setIsMarkAsPaidOpen(false);
        }}
      />

      {/* Delete counterparty confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete ${counterparty.name}?`}
        description="This will delete all loan history and roll back any linked wallet balances. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteCounterparty}
      />

      {/* Edit name dialog */}
      {isEditNameOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditNameOpen(false);
          }}
        >
          <div
            className="glass-strong w-full rounded-[20px] p-5"
            style={{ maxWidth: "340px" }}
          >
            <h2
              className="text-[17px] font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Rename Counterparty
            </h2>

            <div className="space-y-1 mb-4">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => {
                  setEditNameValue(e.target.value);
                  setEditNameError("");
                }}
                placeholder="Enter name"
                maxLength={50}
                autoFocus
                className="w-full rounded-[12px] px-4 py-3 text-[15px] outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: `1px solid ${editNameError ? "var(--color-negative)" : "var(--border-default)"}`,
                  minHeight: "var(--tap-target-min)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setIsEditNameOpen(false);
                }}
              />
              {editNameError && (
                <p
                  className="text-[12px]"
                  style={{ color: "var(--color-negative)" }}
                >
                  {editNameError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditNameOpen(false)}
                className="flex-1 py-3 rounded-[12px] text-[15px] font-medium"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  minHeight: "var(--tap-target-min)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 py-3 rounded-[12px] text-[15px] font-semibold"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                  minHeight: "var(--tap-target-min)",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
