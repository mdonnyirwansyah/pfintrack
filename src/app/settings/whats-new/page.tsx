"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/shared/AppHeader";
import { APP_VERSION } from "@/lib/version";

interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly tagline: string;
  readonly intro: string;
  readonly items: readonly string[];
}

export default function WhatsNewPage() {
  const t = useTranslations("changelog");
  const entries = t.raw("entries") as readonly ChangelogEntry[];

  return (
    <>
      <AppHeader title={t("title")} showBack />

      <div className="px-4 pt-4 pb-4">
        <p
          className="text-[13px] mb-6 px-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("subtitle")}
        </p>

        <ol className="relative space-y-4 m-0 p-0 list-none">
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 w-px"
            style={{ left: "11px", background: "var(--divider)" }}
          />

          {entries.map((entry, index) => {
            const isLatest = index === 0;
            const isCurrent = entry.version === APP_VERSION;

            return (
              <li key={entry.version} className="relative pl-8">
                <span
                  aria-hidden="true"
                  className="absolute top-3 flex items-center justify-center w-[22px] h-[22px] rounded-full"
                  style={{
                    left: 0,
                    background: isLatest ? "var(--color-primary)" : "var(--bg-icon)",
                    boxShadow: "0 0 0 4px var(--bg-app)",
                  }}
                >
                  <Sparkles
                    className="w-3 h-3"
                    style={{ color: isLatest ? "#fff" : "var(--text-tertiary)" }}
                  />
                </span>

                <article
                  className="glass rounded-[16px] p-4"
                  style={{ borderColor: "var(--divider)" }}
                >
                  <header className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-[14px] font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        v{entry.version}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            color: "var(--color-primary)",
                            background: "var(--color-primary-light, rgba(33,150,243,0.12))",
                          }}
                        >
                          {t("currentBadge")}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[11px] whitespace-nowrap"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {entry.date}
                    </span>
                  </header>

                  <h2
                    className="text-[15px] font-semibold m-0 mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.tagline}
                  </h2>

                  <p
                    className="text-[12.5px] mb-3 leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {entry.intro}
                  </p>

                  <ul className="space-y-2 m-0 p-0 list-none">
                    {entry.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[12.5px] leading-relaxed"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span
                          aria-hidden="true"
                          className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
                          style={{ background: "var(--color-primary)" }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
