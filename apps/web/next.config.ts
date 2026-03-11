import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ota/shared"],
  serverExternalPackages: [
    "playwright",
    "playwright-extra",
    "puppeteer-extra-plugin-stealth",
  ],
};

export default nextConfig;
