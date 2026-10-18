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
    expect(job('template')).toBe('');
    expect(weekly).not.toMatch(/pnpm verify --full --timed --perf/);
  });
  it('lets a dispatch name the jobs it runs, every job by default', () => {
    expect(weekly).toMatch(/default: ['"]?full,timed,perf,consumer['"]?/);
    for (const name of ['full', 'timed', 'perf', 'consumer']) expect(job(name)).toContain(`',${name},'`);
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
  });
});
