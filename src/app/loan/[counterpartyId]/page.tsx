// [13] Loan Detail (entries list per counterparty)
export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ counterpartyId: string }>;
}) {
  void params;
  return (
    <div className="px-4 py-4">
      <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Loan Detail — coming soon
      </p>
    </div>
  );
}
