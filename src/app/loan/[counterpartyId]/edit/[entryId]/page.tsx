// [14] Edit Loan Entry
export default function EditLoanEntryPage({
  params,
}: {
  params: Promise<{ counterpartyId: string; entryId: string }>;
}) {
  void params;
  return (
    <div className="px-4 py-4">
      <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Edit Loan Entry — coming soon
      </p>
    </div>
  );
}
