import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What's New",
  description:
    "Cerita di balik setiap update PFinTrack — fitur baru, perbaikan, dan polesan kecil yang bikin aplikasi makin nyaman dipakai.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/settings/whats-new" },
  openGraph: {
    title: "What's New · PFinTrack",
    description:
      "Cerita di balik setiap update PFinTrack — fitur baru, perbaikan, dan polesan kecil.",
    url: "/settings/whats-new",
  },
  twitter: {
    title: "What's New · PFinTrack",
    description:
      "Cerita di balik setiap update PFinTrack.",
  },
};

export default function WhatsNewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
