import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/settings/faq", "/settings/whats-new"],
        disallow: [
          "/transactions",
          "/transactions/",
          "/wallet",
          "/wallet/",
          "/loan",
          "/loan/",
          "/report",
          "/report/",
          "/settings",
          "/settings/",
          "/~offline",
        ],
      },
    ],
    sitemap: "https://pfintrack.vercel.app/sitemap.xml",
    host: "https://pfintrack.vercel.app",
  };
}
