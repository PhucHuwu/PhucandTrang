const isDev = process.env.NODE_ENV !== 'production';

function originOf(url) {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null; // relative values like '/api' are same-origin
  }
}

/** CSP for the public (3D) site. Admin routes keep their own headers below. */
function publicContentSecurityPolicy() {
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
  const connectSrc = [
    "'self'",
    'https://res.cloudinary.com',
    'https://api.cloudinary.com',
    apiOrigin,
    // Dev: local API fallback in services/*Api.ts and the HMR websocket
    ...(isDev ? ['http://localhost:4000', 'ws:'] : []),
  ].filter(Boolean);

  return [
    "default-src 'self'",
    // Next injects inline bootstrap scripts; eval is only needed by the dev server (React Refresh)
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "media-src 'self' blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    `connect-src ${[...new Set(connectSrc)].join(' ')}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

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
      {
        // Everything except /admin/* and /api/admin/*
        source: '/((?!admin(?:/|$)|api/admin(?:/|$)).*)',
        headers: [{ key: 'Content-Security-Policy', value: publicContentSecurityPolicy() }],
      },
      { source: '/admin/:path*', headers: noFraming },
      { source: '/api/admin/:path*', headers: noFraming },
    ];
  },
  webpack: (config, { isServer }) => {
    // konva's Node entry (lib/index-node.js) requires the optional native 'canvas' package
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;
