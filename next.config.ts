import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile testing on local network
  experimental: {
    allowedDevOrigins: ["10.159.134.199"],
  } as any
};

export default nextConfig;
