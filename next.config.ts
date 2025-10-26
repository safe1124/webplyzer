import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers"],
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;
