import type { MetadataRoute } from "next";

const siteUrl = "https://pfintrack.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/settings/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/settings/whats-new`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
