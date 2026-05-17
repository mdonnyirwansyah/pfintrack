import { getTranslations } from "next-intl/server";
import { BookOpen, CreditCard, LayoutDashboard, BarChart2, Settings } from "lucide-react";

export async function HeroMockup() {
  const t = await getTranslations("landing.mockup");

  const items = [
    {
      label: t("items.0.label"),
      sub: t("items.0.category"),
      amount: "5.000.000",
      type: "income" as const,
      time: "08:30",
    },
    {
      label: t("items.1.label"),
      sub: t("items.1.category"),
      amount: "45.000",
      type: "expense" as const,
      time: "12:15",
    },
    {
      label: t("items.2.label"),
      sub: t("items.2.category"),
      amount: "120.000",
      type: "expense" as const,
      time: "07:45",
    },
  ];

  const navTabs = [
    { Icon: BookOpen, active: true },
    { Icon: CreditCard, active: false },
    { Icon: LayoutDashboard, active: false },
    { Icon: BarChart2, active: false },
    { Icon: Settings, active: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mt-7 sm:mt-8"
      style={{ width: "min(300px, 85%)" }}
    >
      <div
        className="rounded-[28px] sm:rounded-[32px] overflow-hidden"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--divider)",
          boxShadow: "0 20px 60px rgba(33,150,243,0.18), 0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 16px",
            borderBottom: "1px solid var(--divider)",
            background: "var(--bg-elevated)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {t("headerTitle")}
          </span>
        </div>

        <div style={{ padding: "12px 12px 4px" }}>
          <div
            className="glass"
            style={{
              borderRadius: 14,
              display: "flex",
              padding: "8px 0",
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 6px" }}>
              <span style={{ fontSize: 8, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 2 }}>
                {t("summary.income")}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-positive)" }}>
                + 5.000.000
              </span>
            </div>
            <div style={{ width: 1, background: "var(--divider)", margin: "4px 0" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 6px" }}>
              <span style={{ fontSize: 8, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 2 }}>
                {t("summary.expenses")}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-negative)" }}>
                - 165.000
              </span>
            </div>
            <div style={{ width: 1, background: "var(--divider)", margin: "4px 0" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 6px" }}>
              <span style={{ fontSize: 8, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 2 }}>
                {t("summary.balance")}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-positive)" }}>
                + 4.835.000
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item) => {
            const isIncome = item.type === "income";
            const color = isIncome ? "var(--color-positive)" : "var(--color-negative)";
            const bg = isIncome ? "var(--color-positive-soft)" : "var(--color-negative-soft)";
            const prefix = isIncome ? "+ " : "- ";
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>
                    {isIncome ? "+" : "-"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
                      {prefix}{item.amount}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                      {item.sub}
                    </span>
                    <span style={{ fontSize: 8, color: "var(--text-tertiary)" }}>
                      {item.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: "10px 0",
            borderTop: "1px solid var(--divider)",
            background: "var(--bg-elevated)",
          }}
        >
          {navTabs.map(({ Icon, active }, i) => (
            <Icon
              key={i}
              width={16}
              height={16}
              style={{
                color: active ? "var(--color-brand)" : "var(--text-tertiary)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
