import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server treats 127.0.0.1 as a different origin from localhost and
  // returns 403 for /_next scripts, which leaves the app stuck on the opening screen.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
