// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import config from '../scripts/verify.config';

const ROOT = path.resolve(import.meta.dirname, '..');
const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/verify.ts', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });

describe('the personas', () => {
  it('refuses an unknown persona before it builds or serves, naming the declared ones', () => {
    const r = run('--as', 'nobody');
    expect(r.status).not.toBe(0);
    const said = `${r.stdout}${r.stderr}`;
    const declared = Object.keys(config.personas ?? {});
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) expect(said, name).toContain(name);
    expect(said).not.toMatch(/^ok\s+build/m);
  });

  it('refuses --as with --perf', () => {
    const r = run('--as', 'viewer', '--perf');
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/--perf/);
  });
});
