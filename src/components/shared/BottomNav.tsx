"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  BarChart2,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const NAV_TAB_DEFS = [
  { key: "transactions" as const, href: "/transactions", icon: BookOpen, prefix: "/transactions" },
  { key: "wallet" as const, href: "/wallet", icon: CreditCard, prefix: "/wallet" },
  { key: "loan" as const, href: "/loan", icon: LayoutDashboard, prefix: "/loan" },
  { key: "report" as const, href: "/report", icon: BarChart2, prefix: "/report" },
  { key: "settings" as const, href: "/settings", icon: Settings, prefix: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t"
      style={{
        height: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        borderColor: "var(--border-nav)",
      }}
    >
      <div className="flex items-center justify-around h-[var(--bottom-nav-height)]">
        {NAV_TAB_DEFS.map(({ key, href, icon: Icon, prefix }) => {
          const isActive = pathname.startsWith(prefix);
          const label = t(key);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5",
                "min-h-[44px] active:scale-[0.88] transition-transform duration-75 will-change-transform"
              )}
              style={{ touchAction: "manipulation" }}
              aria-label={label}
            >
              <Icon
                className="w-5 h-5"
                style={{
                  color: isActive
                    ? "var(--nav-active)"
                    : "var(--nav-inactive)",
                  strokeWidth: isActive ? 2.5 : 1.5,
                }}
              />
              <span
                className="text-[9px] font-medium leading-none"
                style={{
                  color: isActive
                    ? "var(--nav-active)"
                    : "var(--nav-inactive)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
