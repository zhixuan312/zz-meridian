import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // The gate runs the files in parallel; on a loaded machine or a slow runner a jsdom case that takes a second alone can
  // pass vitest's default 5 s and fail a correct tree. The timeout says how long a case may take, not what it proves.
  //
  // Each file still gets a world of its own, as a context in a shared worker and not a process: starting a process and a
  // jsdom for every file was most of what the tests cost. Measured on the 141 files the default verify runs, at the four
  // workers the release runner has: 79 s of CPU as processes, 27 s as contexts, the same 698 cases passing.
  test: { environment: 'jsdom', pool: 'vmThreads', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 30_000 },
});
