import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP testing across multiple devices
  allowedDevOrigins: [
    "192.168.137.220:3000",
    "192.168.137.220",
    "10.159.134.199:3000",
    "10.159.134.199",
    "localhost:3000",
    "localhost",
    "127.0.0.1:3000",
    "127.0.0.1",
  ],
  experimental: {
    allowedDevOrigins: [
      "192.168.137.220:3000",
      "192.168.137.220",
      "10.159.134.199:3000",
      "10.159.134.199",
      "localhost:3000",
      "localhost",
      "127.0.0.1:3000",
      "127.0.0.1",
    ],
  } as any,
};

export default nextConfig;
