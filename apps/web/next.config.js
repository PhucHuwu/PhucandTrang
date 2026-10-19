/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@phucandtrang/shared'],
  poweredByHeader: false,
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    const noFraming = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      { source: '/:path*', headers: common },
      { source: '/admin/:path*', headers: noFraming },
      { source: '/api/admin/:path*', headers: noFraming },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;
