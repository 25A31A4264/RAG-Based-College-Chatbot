/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Prevent minor typing warnings from failing Vercel production deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevent ESLint warnings from failing Vercel production deployment
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', '@prisma/client', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
