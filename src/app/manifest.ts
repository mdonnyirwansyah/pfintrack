import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PFinTrack - Personal Finance Tracker",
    short_name: "PFinTrack",
    description: "Personal Finance Tracker — catat dompet, transaksi, pinjaman, dan laporan keuangan pribadi.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FB",
    theme_color: "#5B8DEF",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "productivity"],
  };
}
