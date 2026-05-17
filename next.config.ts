import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/r/:slug",
        destination: "/report/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
