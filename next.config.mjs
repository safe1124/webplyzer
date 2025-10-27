/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // typedRoutes: true, // Disabled for Turbopack compatibility
    optimizePackageImports: ["sortablejs"],
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  webpack: (config) => {
    // FFmpeg WASM support - add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/static/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/video",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
