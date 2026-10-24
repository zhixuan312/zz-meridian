import type { NextConfig } from 'next';

// Next.js's anonymous usage telemetry is off for `next dev` and `next build`; delete this line to send it.
process.env.NEXT_TELEMETRY_DISABLED ??= '1';

const config: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // Turbopack's chunker keeps every chunk it merges under 50 KB apart and duplicates what it cannot merge: on 2026-10-24
  // every route's first load carried a second copy of the shell and the shared UI set — 40.3 and 29.9 KiB of it on
  // /engineering — which took three routes over their first-load budget (/engineering 832 KiB against the 820 KiB cap,
  // /business at it, /customers/[id] 5.6% over its baseline). Smaller chunks are reusable across pages, so asking for them
  // removes the copies: /engineering 811 KiB, and a page asks for 27 chunks where it asked for 23.
  //
  // A chunk is also a script tag in that page's HTML and a name in its flight payload, so the split costs HTML, and the
  // setting is as coarse as the HTML budget allows. 35000 is the middle of the window measured on 2026-10-24: at 25000
  // /keys grew 5.3% over a 5% cap, and at 45000 the chunker stopped splitting and /engineering was back at 832 KiB. Here
  // every page is within 3.8% of its baseline HTML and /engineering has 9 KiB of its cap left. `docs/testing.md` holds
  // both budgets, and `pnpm verify` measures them.
  experimental: { turbopackChunking: { minChunkSize: 35000, maxChunkCountPerGroup: 80 } },
  // `pnpm verify` sets MERIDIAN_TYPES_CHECKED for its one build, only after its own gate has type-checked this tree with
  // the same tsconfig, so the build does not check it twice. Every other `next build` checks the types itself.
  typescript: { ignoreBuildErrors: process.env.MERIDIAN_TYPES_CHECKED === '1' },
  // Card specifications (README.md next to each component) are read at build time by the Design Atlas.
  outputFileTracingIncludes: { '/system/**': ['./src/**/*.md', './app/**/*.md', './docs/**/*.md', './decisions/**/*.md', './*.md', './tokens/**/*.json'], '/icon': ['./tokens/**/*.json'], '/api/assistant': ['./docs/brief.md'] },
};

export default config;
