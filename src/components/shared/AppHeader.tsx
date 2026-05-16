"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  variant?: "default" | "transparent";
  className?: string;
  style?: React.CSSProperties;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  variant = "default",
  className,
  style,
}: Readonly<AppHeaderProps>) {
  const router = useRouter();
  const tc = useTranslations("common");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 flex items-center px-4",
        "glass-nav",
        "border-b",
        variant === "transparent" && "bg-transparent backdrop-filter-none border-transparent",
        className
      )}
      style={{
        height: "var(--header-height)",
        paddingTop: "env(safe-area-inset-top)",
        borderColor: "var(--border-nav)",
        ...style,
      }}
    >
      <div className="w-10 flex items-center">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
            style={{
              minWidth: "var(--tap-target-min)",
              minHeight: "var(--tap-target-min)",
              color: "var(--text-primary)",
            }}
            aria-label={tc("back")}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1
          className="text-[16px] font-semibold leading-tight truncate max-w-[200px]"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <span
            className="text-[11px] leading-tight mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {subtitle}
          </span>
        )}
      </div>

      <div className="min-w-[44px] flex items-center justify-end">
        {actions}
      </div>
    </header>
  );
}
