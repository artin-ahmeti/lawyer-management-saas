import type { NextConfig } from 'next';
import { launchBlockers } from './src/config/launch';

// A production-stage build must have every public destination configured. The
// preview stage (the default) builds anyway and labels itself as a preview.
if (process.env.NEXT_PUBLIC_SITE_STAGE === 'production') {
  const blockers = launchBlockers(process.env);
  if (blockers.length > 0) {
    throw new Error(`Clepso landing: launch blockers are open:\n- ${blockers.join('\n- ')}`);
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: { position: 'bottom-right' },
  // Keep the server bundle from tracing the monorepo root.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
