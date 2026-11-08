import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser talks to the Next.js server, which proxies /api/backend to the
  // Express API. Same-origin requests keep the NextAuth cookie intact and avoid
  // CORS preflights in development.
  async rewrites() {
    const apiUrl = (process.env.API_URL ?? "http://localhost:4000/api/v1").replace(
      /\/+$/,
      "",
    );

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
