/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // typedRoutes: true, // Disabled for Turbopack compatibility
    optimizePackageImports: ["sortablejs"],
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;
