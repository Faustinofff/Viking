/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@viking/shared"],
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    config.externals = [...(config.externals || []), "onnxruntime-node"];
    return config;
  },
};

module.exports = nextConfig;
