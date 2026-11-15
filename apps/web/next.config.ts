import type { NextConfig } from 'next';

// Extra dev origins (e.g. a cloud preview proxy) are supplied per-process.
const allowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  experimental: {
    optimizePackageImports: ['@react-three/drei'],
  },
};

export default nextConfig;
