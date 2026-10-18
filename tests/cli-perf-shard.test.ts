// @vitest-environment node
// The 20-sample protocol runs only in CI, split by route into shards on separate runners, each within 30 minutes
// (the stakeholder, 2026-10-18). A shard is a share of the rail routes; the shards together run every route once.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseShard, shardOf } from '../scripts/lib/shard.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const routes = Array.from({ length: 15 }, (_, i) => `/r${i}`);
const run = (script: string, ...args: string[]) => {
  const env = { ...process.env };
  delete env.CI;
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000, env });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

describe('a shard of the rail routes', () => {
  it('takes every n-th route, so the shards together run each route once', () => {
    expect(shardOf(routes, { index: 1, count: 5 })).toEqual(['/r0', '/r5', '/r10']);
    const all = [1, 2, 3, 4, 5].flatMap((index) => shardOf(routes, { index, count: 5 }));
    expect([...all].sort()).toEqual([...routes].sort());
  });
  it('is every route as 1/1', () => expect(shardOf(routes, { index: 1, count: 1 })).toEqual(routes));
  it('reads i/n and refuses anything else', () => {
    expect(parseShard('2/5')).toEqual({ index: 2, count: 5 });
    for (const bad of ['0/5', '6/5', '2', 'a/b', '2/0', '1.5/3', '']) expect(() => parseShard(bad)).toThrow(/--shard/);
  });
});

describe('the whole protocol runs only in CI', () => {
  it('perf refuses it on this machine, before Chrome starts', () => {
    const r = run('scripts/perf.ts', '--base', 'http://127.0.0.1:9');
    expect(r.status).toBe(1);
    expect(r.out).toContain('the whole 20-sample protocol runs only in CI');
  });
  it('verify refuses --perf on this machine, before the gate runs', () => {
    const r = run('scripts/verify.ts', '--perf');
    expect(r.status).toBe(1);
    expect(r.out).toContain('the whole 20-sample protocol runs only in CI');
    expect(r.out).not.toMatch(/tokens are fresh/);
  });
  it('verify refuses --shard without --perf', () => {
    const r = run('scripts/verify.ts', '--shard', '1/5');
    expect(r.status).toBe(1);
    expect(r.out).toContain('verify: --shard divides the --perf protocol; pass it with --perf alone');
  });
  it('verify refuses a shard beside a tier that can meet the standard', () => {
    const r = run('scripts/verify.ts', '--full', '--timed', '--perf', '--shard', '1/5');
    expect(r.status).toBe(1);
    expect(r.out).toContain('pass it with --perf alone');
  });
});
