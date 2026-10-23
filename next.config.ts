import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Restored Turbopack build caches have served outdated global CSS after theme changes.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "i.mydramalist.com",
      },
      {
        protocol: "https",
        hostname: "simkl.in",
        pathname: "/posters/**",
      },
    ],
  },
};

export default nextConfig;
