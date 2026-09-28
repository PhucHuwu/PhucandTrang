const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@phucandtrang/shared'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

module.exports = nextConfig;
