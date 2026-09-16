/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_SUPABASE_OS_URL:
      process.env.NEXT_PUBLIC_SUPABASE_OS_URL,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;