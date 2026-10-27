import { defineConfig } from 'vitest/config';

// The Postgres leg alone, in Node: the weekly job `postgres` runs `vitest run --config scripts/fixtures/postgres/vitest.config.ts`.
export default defineConfig({ test: { environment: 'node', include: ['scripts/fixtures/postgres/*.test.ts'], testTimeout: 30_000, fileParallelism: false } });
