import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: {
    maximumRedirects: 0,
    maximumResponseBody: 6 * 1024 * 1024,
    dangerouslyAllowLocalIP: false,
    remotePatterns: [
      { protocol: 'https', hostname: '**.yelpcdn.com', port: '', pathname: '/bphoto/**' },
    ],
  },
  experimental: { staleTimes: { dynamic: 60, static: 60 } },
  // Messaging clients need the recipe's metadata in the initial HTML head.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
