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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "PFinTrack",
    template: "%s | PFinTrack",
  },
  description: "Personal Finance Tracker — catat dompet, transaksi, pinjaman, dan laporan keuangan pribadi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PFinTrack",
  },
  formatDetection: {
    telephone: false,
  },
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
            </AppProviders>
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
