import type { NextConfig } from 'next';

// Next.js's anonymous usage telemetry is off for `next dev` and `next build`; delete this line to send it.
process.env.NEXT_TELEMETRY_DISABLED ??= '1';

const config: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // Card specifications (README.md next to each component) are read at build time by the Design Atlas.
  outputFileTracingIncludes: { '/system/**': ['./src/**/*.md', './app/**/*.md', './docs/**/*.md', './decisions/**/*.md', './*.md', './tokens/**/*.json'], '/icon': ['./tokens/**/*.json'], '/api/assistant': ['./docs/brief.md'] },
};

export default config;
