import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/templates/**/*', './public/fonts/**/*'],
  },
};

export default nextConfig;
