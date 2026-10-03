/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_SUPABASE_OS_URL: process.env.NEXT_PUBLIC_SUPABASE_OS_URL,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // ✅ დამატებულია: skia-canvas-ის გამოყოფა, რათა Webpack-მა არ სცადოს მისი ბანდლირება
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'skia-canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;