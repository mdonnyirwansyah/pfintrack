// [5] Edit Transaction
export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  return (
    <div className="px-4 py-4">
      <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Edit Transaction — coming soon
      </p>
    </div>
  );
}
