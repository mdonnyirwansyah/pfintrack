import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS
  ? process.env.NEXT_DEV_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [];

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@base-ui/react",
      "react-day-picker",
    ],
  },
};

export default withNextIntl(withSerwist(nextConfig));
