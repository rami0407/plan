import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/plan' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
