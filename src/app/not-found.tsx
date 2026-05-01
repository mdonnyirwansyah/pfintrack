"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <FileQuestion className="w-16 h-16 mb-4" style={{ color: "var(--text-tertiary)" }} />
      <h2 className="text-[22px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Page Not Found
      </h2>
      <p className="text-[15px] mb-6" style={{ color: "var(--text-secondary)" }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/transactions"
        className="px-6 py-3 rounded-full text-[15px] font-semibold text-white"
        style={{ backgroundColor: "var(--color-brand)" }}
      >
        Go to Transactions
      </Link>
    </div>
  );
}
