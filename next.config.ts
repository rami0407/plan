import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/plan',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
