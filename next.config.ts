import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS
  ? process.env.NEXT_DEV_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [];

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),
};

export default withNextIntl(withSerwist(nextConfig));
