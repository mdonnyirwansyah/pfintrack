"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shared/AppHeader";

interface FaqItem {
  readonly q: string;
  readonly a: string;
}

interface FaqCategory {
  readonly title: string;
  readonly items: readonly FaqItem[];
}

export default function FaqPage() {
  const t = useTranslations("faq");
  const categories = t.raw("categories") as readonly FaqCategory[];
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const filteredCategories = useMemo<readonly FaqCategory[]>(() => {
    if (!hasQuery) return categories;
    const needle = trimmedQuery.toLowerCase();
    return categories
      .map((cat) => ({
        title: cat.title,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(needle) ||
            item.a.toLowerCase().includes(needle),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, hasQuery, trimmedQuery]);

  const hasResults = filteredCategories.length > 0;

  return (
    <>
      <AppHeader title={t("title")} showBack />

      <div className="px-4 pt-4 pb-4">
        <p
          className="text-[13px] mb-4 px-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("subtitle")}
        </p>

        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="glass w-full rounded-[12px] pl-9 pr-10 py-2.5 text-[13px] outline-none"
            style={{
              color: "var(--text-primary)",
              minHeight: "var(--tap-target-min)",
            }}
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("searchClear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-opacity active:opacity-70"
              style={{
                minHeight: "var(--tap-target-min)",
                minWidth: "var(--tap-target-min)",
                color: "var(--text-tertiary)",
              }}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {!hasResults && (
          <p
            className="text-[13px] text-center px-4 py-8"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("noResults", { query: trimmedQuery })}
          </p>
        )}

        {filteredCategories.map((category) => (
          <section key={category.title} className="mb-6">
            <h2
              className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              {category.title}
            </h2>

            <div className="glass rounded-[16px] overflow-hidden">
              {category.items.map((item, index) => (
                <details
                  key={item.q}
                  className="group"
                  open={hasQuery}
                  style={{
                    borderTop: index === 0 ? "none" : "1px solid var(--divider)",
                  }}
                >
                  <summary
                    className="flex items-start justify-between gap-3 px-4 py-3.5 cursor-pointer list-none transition-opacity active:opacity-70"
                    style={{ minHeight: "var(--tap-target-min)" }}
                  >
                    <span
                      className="text-[13px] font-medium leading-snug flex-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.q}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-180"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-hidden="true"
                    />
                  </summary>
                  <div
                    className="px-4 pb-3.5 text-[12.5px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
