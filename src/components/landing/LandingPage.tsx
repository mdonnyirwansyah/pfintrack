import { getTranslations } from "next-intl/server";
import { Wallet, ArrowLeftRight, HandCoins, PieChart, ShieldCheck, Smartphone, Globe } from "lucide-react";
import { StartButton } from "./StartButton";
import { HeroMockup } from "./HeroMockup";
import { ConsentLink } from "./ConsentLink";

export async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    { key: "wallet", Icon: Wallet },
    { key: "transactions", Icon: ArrowLeftRight },
    { key: "loan", Icon: HandCoins },
    { key: "report", Icon: PieChart },
  ] as const;

  const trust = [
    { key: "private", Icon: ShieldCheck },
    { key: "offline", Icon: Smartphone },
    { key: "bilingual", Icon: Globe },
  ] as const;

  return (
    <div
      className="px-4 sm:px-5 pb-12 mx-auto"
      style={{
        maxWidth: 720,
        color: "var(--text-primary)",
        marginTop: "calc(-1 * var(--header-height))",
        paddingTop: "calc(var(--header-height) + 16px)",
      }}
    >
      <section aria-labelledby="hero-title" className="text-center mb-10 sm:mb-12">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] mb-4 sm:mb-6"
          style={{
            background: "var(--color-brand)",
            boxShadow: "0 8px 24px rgba(33,150,243,0.25)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M10 26V12h10a5 5 0 0 1 0 10H10" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 19h8" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1
          id="hero-title"
          className="text-[26px] sm:text-[34px] font-bold leading-[1.15] mb-3 tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-[14px] sm:text-[17px] leading-relaxed mx-auto"
          style={{ color: "var(--text-secondary)", maxWidth: 480 }}
        >
          {t("hero.subtitle")}
        </p>
        <HeroMockup />
      </section>

      <section aria-labelledby="features-title" className="mb-10 sm:mb-12">
        <h2
          id="features-title"
          className="text-[17px] sm:text-[20px] font-semibold mb-4 sm:mb-5 text-center px-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("features.title")}
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 m-0 p-0 list-none">
          {features.map(({ key, Icon }) => (
            <li key={key}>
              <article
                aria-labelledby={`feature-${key}-title`}
                className="glass rounded-[14px] sm:rounded-[16px] p-3.5 sm:p-4 flex gap-3 h-full"
                style={{ borderColor: "var(--divider)" }}
              >
                <div
                  aria-hidden="true"
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px]"
                  style={{ background: "var(--bg-icon)", color: "var(--color-brand)" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id={`feature-${key}-title`}
                    className="text-[14px] sm:text-[15px] font-semibold mb-0.5 sm:mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t(`features.items.${key}.title`)}
                  </h3>
                  <p
                    className="text-[12.5px] sm:text-[13px] leading-relaxed m-0"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t(`features.items.${key}.desc`)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trust-title" className="mb-10 sm:mb-12">
        <h2
          id="trust-title"
          className="text-[17px] sm:text-[20px] font-semibold mb-4 sm:mb-5 text-center px-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("trust.heading")}
        </h2>
        <ul className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 m-0 p-0 list-none">
          {trust.map(({ key, Icon }) => (
            <li key={key}>
              <article
                aria-labelledby={`trust-${key}-title`}
                className="glass flex gap-3 p-3.5 sm:p-4 rounded-[14px] sm:rounded-[16px] h-full"
                style={{ borderColor: "var(--divider)" }}
              >
                <div
                  aria-hidden="true"
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px]"
                  style={{ background: "var(--bg-icon)", color: "var(--color-brand)" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id={`trust-${key}-title`}
                    className="text-[13px] font-semibold mb-0.5 leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t(`trust.${key}.title`)}
                  </h3>
                  <p
                    className="text-[12px] leading-snug m-0"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t(`trust.${key}.desc`)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cta-title" className="text-center">
        <h2
          id="cta-title"
          className="text-[19px] sm:text-[20px] font-semibold mb-2 sm:mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {t("finalCta.title")}
        </h2>
        <p
          className="text-[13px] sm:text-[14px] mb-5 sm:mb-6 mx-auto"
          style={{ color: "var(--text-secondary)", maxWidth: 360 }}
        >
          {t("finalCta.subtitle")}
        </p>
        <StartButton label={t("hero.cta")} variant="primary" />
        <p
          className="text-[11px] mt-3 sm:mt-4 px-4 mx-auto leading-relaxed"
          style={{ color: "var(--text-tertiary)", maxWidth: 360 }}
        >
          {t("hero.consent")}
        </p>
      </section>

      <footer className="mt-12 sm:mt-16 text-center" role="contentinfo">
        <nav aria-label={t("footerNav.label")} className="mb-3">
          <ul className="flex items-center justify-center gap-2 m-0 p-0 list-none">
            <li>
              <ConsentLink
                href="/settings/faq"
                className="inline-flex items-center justify-center min-h-[44px] px-3 text-[13px] underline-offset-2 hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("footerNav.faq")}
              </ConsentLink>
            </li>
            <li
              aria-hidden="true"
              className="text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              ·
            </li>
            <li>
              <ConsentLink
                href="/settings/whats-new"
                className="inline-flex items-center justify-center min-h-[44px] px-3 text-[13px] underline-offset-2 hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("footerNav.whatsNew")}
              </ConsentLink>
            </li>
          </ul>
        </nav>
        <p className="text-[11px] px-4" style={{ color: "var(--text-tertiary)" }}>
          {t("footer")}
        </p>
      </footer>
    </div>
  );
}
