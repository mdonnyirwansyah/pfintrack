import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What's New",
  description:
    "Cerita di balik setiap update PFinTrack — fitur baru, perbaikan, dan polesan kecil yang bikin aplikasi makin nyaman dipakai.",
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
