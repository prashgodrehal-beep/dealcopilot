/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Fix: Move serverExternalPackages to the TOP LEVEL for Next.js 14.2+
  serverExternalPackages: ['pdf-parse', 'mammoth', '@anthropic-ai/sdk'],
};

module.exports = nextConfig;