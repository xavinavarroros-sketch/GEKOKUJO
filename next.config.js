/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { cpus: 1 },
  outputFileTracing: false,
  staticPageGenerationTimeout: 10,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
