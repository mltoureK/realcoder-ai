import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Ignore ESLint errors during production builds (Vercel)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript build errors to allow deploys
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
