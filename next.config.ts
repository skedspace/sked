/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Local Supabase serves storage over http://localhost:54321. Without
      // this, next/image rejects every uploaded court photo and logo in
      // development with "hostname is not configured". Dev only — production
      // URLs are always *.supabase.co.
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "http" as const, hostname: "localhost", port: "54321" }]
        : []),
    ],
  },
  // Redirects for public page
  async redirects() {
    return [];
  },
};

export default nextConfig;
