import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship compiled ESM; nothing to transpile. Keep the
  // server bundle from tracing the monorepo root.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};

export default nextConfig;
