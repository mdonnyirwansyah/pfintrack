"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface StartButtonProps {
  readonly label: string;
  readonly variant?: "primary" | "secondary";
}

export function StartButton({ label, variant = "primary" }: StartButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    try {
      localStorage.setItem("pfintrack_consent_accepted_at", new Date().toISOString());
    } catch {}
    startTransition(() => {
      router.push("/transactions");
    });
  };

  const sizeClasses =
    variant === "primary"
      ? "px-6 py-3 text-[15px] min-h-[48px] w-full sm:w-auto sm:min-w-[220px] max-w-[320px]"
      : "px-6 py-3 text-[14px] min-h-[44px] w-full sm:w-auto sm:min-w-[180px] max-w-[280px]";

  const boxShadow =
    variant === "primary"
      ? "0 6px 20px rgba(33,150,243,0.3)"
      : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform active:scale-95 disabled:opacity-70 ${sizeClasses}`}
      style={{
        background: "var(--color-brand)",
        color: "#fff",
        boxShadow,
      }}
    >
      {label}
    </button>
  );
}
