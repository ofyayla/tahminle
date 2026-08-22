import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These ship a native chromium binary (used by lib/liveScoreScraper.ts) —
  // webpack must not try to bundle them, just resolve at runtime like any
  // other node_modules package.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  async headers() {
    return [
      {
        // The Expo app has no browser origin to allow-list, so open the API
        // up broadly; it's already gated per-request by the session token.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
