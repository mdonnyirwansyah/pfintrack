import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AppProviders } from "@/components/shared/AppProviders";
import { BottomNav } from "@/components/shared/BottomNav";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { ColorThemeProvider } from "@/components/shared/ColorThemeProvider";
import { ProductTourLazy } from "@/components/shared/ProductTourLazy";
import { TourInitializer } from "@/components/shared/TourInitializer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = "https://pfintrack.vercel.app";

const FALLBACK_DESCRIPTION =
  "Catat dompet, transaksi, pinjaman, dan laporan dalam satu aplikasi sederhana. Gratis, tanpa daftar, datamu tetap di perangkatmu.";
const FALLBACK_TITLE = "PFinTrack — Pelacak Keuangan Pribadi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo");
  const locale = await getLocale();
  const title = t("title") || FALLBACK_TITLE;
  const description = t("description") || FALLBACK_DESCRIPTION;
  const ogLocale = locale === "id" ? "id_ID" : "en_US";
  const alternateLocale = locale === "id" ? ["en_US"] : ["id_ID"];

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: "%s · PFinTrack" },
    description,
    applicationName: "PFinTrack",
    authors: [{ name: "PFinTrack" }],
    keywords: [
      "personal finance",
      "finance tracker",
      "money manager",
      "budget app",
      "catat keuangan",
      "pencatat keuangan",
      "aplikasi keuangan",
      "dompet digital",
      "PWA finance",
    ],
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "PFinTrack" },
    formatDetection: { telephone: false },
    alternates: {
      canonical: "/",
      languages: { "id-ID": "/", "en-US": "/", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "PFinTrack",
      title,
      description,
      url: siteUrl,
      locale: ogLocale,
      alternateLocale,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    verification: {
      google: "3PcPMREPqdetFJv8PnPYDXTAQxfUM1uP9IvnvxEYZPQ",
      yandex: "2f8f5011b9d77f5e",
    },
    category: "finance",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5B8DEF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const seoT = await getTranslations("seo");
  const ldDescription = seoT("description") || FALLBACK_DESCRIPTION;

  return (
    <html
      lang={locale}
      className={inter.variable}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="antialiased"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pfintrack_color_theme');document.documentElement.setAttribute('data-color-theme',t==='pink'?'pink':'blue');if(localStorage.getItem('pfintrack_consent_accepted_at')){document.documentElement.setAttribute('data-consent-accepted','true');}}catch(_){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "PFinTrack",
              "alternateName": "Personal Finance Tracker",
              "description": ldDescription,
              "url": siteUrl,
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Any (Web, PWA)",
              "browserRequirements": "Requires JavaScript and IndexedDB",
              "inLanguage": ["id-ID", "en-US"],
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
              },
              "author": { "@type": "Organization", "name": "PFinTrack" },
              "softwareVersion": "1.0.3",
              "isAccessibleForFree": true,
              "featureList": [
                "Wallet management",
                "Income, expense, and transfer tracking",
                "Loan tracking with auto-settlement",
                "Real-time, monthly, and custom reports",
                "Bilingual (Indonesia/English)",
                "Works offline (PWA)",
                "100% on-device storage",
              ],
            }),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ColorThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppProviders>
              <main
                style={{
                  paddingTop: "var(--header-height)",
                  paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
                  minHeight: "100dvh",
                }}
              >
                <div
                  className="sticky z-30"
                  style={{ top: "var(--header-height)" }}
                >
                  <DemoBanner />
                </div>
                {children}
              </main>
              <BottomNav />
              <ProductTourLazy />
              <TourInitializer />
            </AppProviders>
          </NextIntlClientProvider>
          </ColorThemeProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
