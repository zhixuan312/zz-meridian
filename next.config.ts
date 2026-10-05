import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Card specifications (README.md next to each component) are read at build time by the Design Atlas.
  outputFileTracingIncludes: { '/system/**': ['./src/**/*.md', './app/**/*.md', './docs/**/*.md', './decisions/**/*.md', './*.md', './tokens/**/*.json'], '/icon': ['./tokens/**/*.json'] },
};

export default config;
