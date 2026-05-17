import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Pertanyaan yang sering ditanyakan seputar PFinTrack: privasi data, backup, fitur dompet, transaksi, dan pinjaman.",
  alternates: { canonical: "/settings/faq" },
  openGraph: {
    title: "FAQ · PFinTrack",
    description:
      "Pertanyaan yang sering ditanyakan seputar PFinTrack: privasi data, backup, fitur dompet, transaksi, dan pinjaman.",
    url: "/settings/faq",
  },
  twitter: {
    title: "FAQ · PFinTrack",
    description:
      "Pertanyaan yang sering ditanyakan seputar PFinTrack.",
  },
};

export default function FaqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
