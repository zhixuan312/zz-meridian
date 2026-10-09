import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // The gate runs the files in parallel; on a loaded machine or a slow runner a jsdom case that takes a second alone can
  // pass vitest's default 5 s and fail a correct tree. The timeout says how long a case may take, not what it proves.
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 30_000 },
});
