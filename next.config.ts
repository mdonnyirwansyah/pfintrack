import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Silence Turbopack warning — Serwist injects webpack config, we don't need it in dev
  turbopack: {},
};

export default withSerwist(nextConfig);
