import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev-only route indicator off the sidebar rail.
  devIndicators: { position: 'bottom-right' },
  // Workspace packages ship compiled ESM; nothing to transpile. Keep the
  // server bundle from tracing the monorepo root.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};

export default nextConfig;
