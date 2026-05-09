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
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { useTranslations } from "next-intl";

// [13] Loan Detail (entries list per counterparty)
export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ counterpartyId: string }>;
}) {
  const { counterpartyId } = use(params);
  const router = useRouter();
  const t = useTranslations("loan");
  const tc = useTranslations("common");

  const {
    counterparties,
    loadCounterparties,
    markAsPaid,
    unmarkAsPaid,
    renameCounterparty,
    deleteCounterparty,
    isNameTaken,
  } = useLoanCounterpartyStore();

  const { entries, loadEntriesForCounterparty } = useLoanEntryStore();
  const { wallets, loadWallets } = useWalletStore();

  const [isMarkAsPaidOpen, setIsMarkAsPaidOpen] = useState(false);
  const [isUnmarkPaidOffOpen, setIsUnmarkPaidOffOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editNameError, setEditNameError] = useState("");

  useEffect(() => {
    loadCounterparties();
    loadEntriesForCounterparty(counterpartyId);
    void loadWallets();
  }, [counterpartyId, loadCounterparties, loadEntriesForCounterparty, loadWallets]);

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

  // Sort entries: DESC by date+time, fallback to created_at on tie (minute resolution)
  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const da = `${a.transaction_date}T${a.transaction_time}`;
        const db = `${b.transaction_date}T${b.transaction_time}`;
        const byDatetime = db.localeCompare(da);
        if (byDatetime !== 0) return byDatetime;
        // Tiebreaker: created_at (ISO with seconds) — DESC
        return b.created_at.localeCompare(a.created_at);
      }),
    [entries]
  );

  // FAB actions: navigate to add forms with counterpartyId pre-filled
  const fabActions = [
    {
      label: t("fab.give"),
      icon: <TrendingDown className="w-5 h-5 text-white" />,
      color: "var(--color-negative)",
      onClick: () =>
        router.push(`/loan/add/give?counterpartyId=${counterpartyId}`),
    },
    {
      label: t("fab.get"),
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
      setEditNameError(t("validation.renameRequired"));
      return;
    }
    if (trimmed.length < 2) {
      setEditNameError(t("validation.nameTooShort"));
      return;
    }
    if (trimmed.length > 50) {
      setEditNameError(t("validation.nameTooLong"));
      return;
    }
    if (isNameTaken(trimmed, counterpartyId)) {
      setEditNameError(t("validation.renameTaken"));
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
        <AppHeader title={t("title")} showBack />
        <div className="px-4 py-8">
          <EmptyState
            icon={Users}
            title={t("counterpartyNotFound")}
            description={t("counterpartyNotFoundDesc")}
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
      {isPaidOff && (
        <button
          onClick={() => setIsUnmarkPaidOffOpen(true)}
          className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
          style={{
            minWidth: "var(--tap-target-min)",
            minHeight: "var(--tap-target-min)",
            color: "var(--color-accent-warm)",
          }}
          aria-label="Unmark paid off"
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
        subtitle={isPaidOff ? t("paidOff") : t("notPaidOff")}
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
            title={t("noEntries")}
            description={t("noEntriesDesc")}
          />
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => (
              <LoanEntryListItem
                key={entry.id}
                entry={entry}
                walletName={wallets.find((w) => w.id === entry.wallet_id)?.name ?? null}
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
        title={t("markPaidOffTitle", { name: counterparty.name })}
        description={t("markPaidOffDesc")}
        confirmLabel={t("markPaidOff")}
        cancelLabel={tc("cancel")}
        variant="default"
        onConfirm={() => {
          markAsPaid(counterpartyId);
          setIsMarkAsPaidOpen(false);
        }}
      />

      {/* Unmark paid off confirmation */}
      <ConfirmDialog
        open={isUnmarkPaidOffOpen}
        onOpenChange={setIsUnmarkPaidOffOpen}
        title={t("unmarkPaidOff")}
        description={t("markPaidOffDesc")}
        confirmLabel={t("unmarkPaidOff")}
        cancelLabel={tc("cancel")}
        variant="default"
        onConfirm={() => {
          unmarkAsPaid(counterpartyId);
          setIsUnmarkPaidOffOpen(false);
        }}
      />

      {/* Delete counterparty confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("deleteCounterpartyConfirm.title")}
        description={t("deleteCounterpartyConfirm.description", { name: counterparty.name })}
        confirmLabel={t("deleteCounterpartyConfirm.confirm")}
        cancelLabel={t("deleteCounterpartyConfirm.cancel")}
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
              className="text-[16px] font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("rename.title")}
            </h2>

            <div className="space-y-1 mb-4">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => {
                  setEditNameValue(e.target.value);
                  setEditNameError("");
                }}
                placeholder={t("rename.namePlaceholder")}
                maxLength={50}
                autoFocus
                className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
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
                  className="text-[11px]"
                  style={{ color: "var(--color-negative)" }}
                >
                  {editNameError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditNameOpen(false)}
                className="flex-1 py-3 rounded-[12px] text-[14px] font-medium"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  minHeight: "var(--tap-target-min)",
                }}
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                  minHeight: "var(--tap-target-min)",
                }}
              >
                {tc("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
