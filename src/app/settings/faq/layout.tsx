import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface FaqItem {
  readonly q: string;
  readonly a: string;
}

interface FaqCategory {
  readonly title: string;
  readonly items: readonly FaqItem[];
}

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Pertanyaan yang sering ditanyakan seputar PFinTrack: privasi data, backup, fitur dompet, transaksi, dan pinjaman.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/settings/faq" },
  openGraph: {
    title: "FAQ · PFinTrack",
    description:
      "Pertanyaan yang sering ditanyakan seputar PFinTrack: privasi data, backup, fitur dompet, transaksi, dan pinjaman.",
    url: "/settings/faq",
  },
  twitter: {
    title: "FAQ · PFinTrack",
    description: "Pertanyaan yang sering ditanyakan seputar PFinTrack.",
  },
};

export default async function FaqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("faq");
  const categories = t.raw("categories") as readonly FaqCategory[];

  const faqEntries = categories.flatMap((cat) =>
    cat.items.map((item) => ({
      "@type": "Question" as const,
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer" as const,
        "text": item.a,
      },
    }))
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqEntries,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
