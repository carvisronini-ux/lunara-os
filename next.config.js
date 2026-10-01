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

  // ✅ დამატებულია Webpack კონფიგურაცია .node ფაილების სწორად დასამუშავებლად
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.module.rules.push({
        test: /\.node$/,
        loader: 'next/dist/build/webpack/loaders/native-module-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;