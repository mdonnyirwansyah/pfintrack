// [18] Edit Custom Report
export default function EditCustomReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  return (
    <div className="px-4 py-4">
      <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Edit Custom Report — coming soon
      </p>
    </div>
  );
}
