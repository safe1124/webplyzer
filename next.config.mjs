/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ["sortablejs"],
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;
