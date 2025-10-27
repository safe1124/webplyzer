/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // typedRoutes: true, // Disabled for Turbopack compatibility
    optimizePackageImports: ["sortablejs"],
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/static/:path*",
      },
    ];
  },
};

export default nextConfig;
