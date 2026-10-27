// @vitest-environment node
// Weekly runs each tier as its own job, the 20-sample protocol in route shards on separate runners, so a red is rerun
// by its own job in minutes rather than the whole workflow in hours (the stakeholder, 2026-10-18).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
const weekly = read('.github/workflows/weekly.yml');
/** The text of one top-level job, from its key to the next job's. */
const job = (name: string) => {
  const start = weekly.search(new RegExp(`^  ${name}:$`, 'm'));
  if (start < 0) return '';
  const rest = weekly.slice(start + 1);
  const next = rest.search(/^  [a-z][\w-]*:$/m);
  return next < 0 ? rest : rest.slice(0, next);
};

describe('weekly', () => {
  it('runs each tier as its own job', () => {
    expect(job('full')).toMatch(/pnpm verify --full\b(?! --)/);
    expect(job('timed')).toMatch(/pnpm verify --timed\b(?! --)/);
    expect(job('perf')).toMatch(/pnpm verify --perf --shard \$\{\{ matrix\.shard \}\}\/5/);
    expect(job('perf')).toMatch(/shard: \[1, 2, 3, 4, 5\]/);
    expect(job('consumer')).toMatch(/cli\/scripts\/smoke\.ts/);
    // The adversarial sample every browser suite is held to, on the week's browser: Chrome is an input no commit pins.
    expect(job('deep')).toMatch(/vitest run tests\/deep- --no-file-parallelism/);
    // The references' Postgres code against a real Postgres and a pooler; a skip judges nothing, so it fails the job.
    expect(job('postgres')).toMatch(/vitest run tests\/deep-postgres/);
    expect(job('postgres')).toMatch(/MERIDIAN_POSTGRES_URL: .*:5432\//);
    expect(job('postgres')).toMatch(/MERIDIAN_POOLER_URL: .*:6432\//);
    expect(job('postgres')).toMatch(/POOL_MODE: transaction/);
    expect(job('postgres')).toMatch(/grep -q skipped/);
    expect(job('postgres')).toMatch(/image: postgres:[\w.-]+@sha256:[0-9a-f]{64}/);
    expect(job('postgres')).toMatch(/image: edoburu\/pgbouncer:[\w.-]+@sha256:[0-9a-f]{64}/);
    expect(job('template')).toBe('');
    expect(weekly).not.toMatch(/pnpm verify --full --timed --perf/);
  });
  it('lets a dispatch name the jobs it runs, every job by default', () => {
    expect(weekly).toMatch(/default: ['"]?full,timed,perf,consumer,deep,postgres['"]?/);
    for (const name of ['full', 'timed', 'perf', 'consumer', 'deep', 'postgres']) expect(job(name)).toContain(`',${name},'`);
  });
  it('refuses a dispatch that names no job, or a name that is not one, before any job runs', () => {
    expect(job('named')).toMatch(/full\|timed\|perf\|consumer\|deep\|postgres\)/);
    expect(job('named')).toMatch(/JOBS: \$\{\{ inputs\.jobs \|\| 'full,timed,perf,consumer,deep,postgres' \}\}/);
    for (const name of ['full', 'timed', 'perf', 'consumer', 'deep', 'postgres']) expect(job(name)).toMatch(/needs: named/);
  });
  it('gives each tier a runner of its own, its log and room for a slow day', () => {
    for (const name of ['full', 'timed', 'perf']) {
      expect(job(name)).toMatch(/timeout-minutes: 45/);
      expect(job(name)).toMatch(/CHROME: \/usr\/bin\/google-chrome/);
      expect(job(name)).toMatch(/set -euo pipefail/);
      expect(job(name)).toMatch(/\| tee out\//);
    }
    expect(job('perf')).toMatch(/fail-fast: false/);
    expect(job('perf')).toMatch(/name: perf-\$\{\{ matrix\.shard \}\}/);
  });
});

describe('the testing standard', () => {
  it('says the whole protocol runs only in CI, in shards', () => {
    const doc = read('docs/testing.md');
    expect(doc).toMatch(/only in CI/);
    expect(doc).toContain('--shard <i>/<n>');
    for (const rel of ['docs/testing.md', 'cli/src/context.ts', 'docs/start-a-dashboard.md', 'docs/distribution.md', 'CONTRIBUTING.md', 'README.md']) {
      expect(read(rel), rel).not.toMatch(/--full --timed --perf/);
    }
    // A migration's instructions are what an adopter reads on update: they name the shard, since the whole protocol refuses outside CI.
    expect(read('cli/src/migrations.ts')).not.toMatch(/`pnpm verify --perf`/);
  });
});
