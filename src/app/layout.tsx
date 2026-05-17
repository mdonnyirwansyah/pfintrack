import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
const siteDescription =
  "Catat dompet, transaksi, pinjaman, dan laporan keuangan pribadi. Gratis, tanpa daftar, data sepenuhnya di perangkatmu.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PFinTrack — Personal Finance Tracker",
    template: "%s · PFinTrack",
  },
  description: siteDescription,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PFinTrack",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/",
      "en-US": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: "PFinTrack",
    title: "PFinTrack — Personal Finance Tracker",
    description: siteDescription,
    url: siteUrl,
    locale: "id_ID",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PFinTrack — Personal Finance Tracker",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "3PcPMREPqdetFJv8PnPYDXTAQxfUM1uP9IvnvxEYZPQ",
    yandex: "2f8f5011b9d77f5e",
  },
  category: "finance",
};

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
            __html: `(function(){var t=localStorage.getItem('pfintrack_color_theme');document.documentElement.setAttribute('data-color-theme',t==='pink'?'pink':'blue');})();`,
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
