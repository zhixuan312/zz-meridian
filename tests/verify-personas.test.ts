// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import config from '../scripts/verify.config';

const ROOT = path.resolve(import.meta.dirname, '..');
const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/verify.ts', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });

describe('the personas', () => {
  it('declares the five the spec freezes, with literal expected routes', () => {
    const personas = config.personas ?? {};
    expect(Object.keys(personas).sort()).toEqual(['admin', 'key-manager', 'member', 'owner', 'viewer']);
    const viewer = personas.viewer;
    expect(viewer.cookie).toEqual({ name: 'zz_meridian_view_as', value: 'members_12' });
    expect([...viewer.expectedRoutes]).toEqual(['/', '/requests', '/analytics', '/health', '/customers', '/settings', '/system', '/system/start/start-a-dashboard']);
    expect(Object.keys(viewer.deniedProbe ?? {}).sort()).toEqual(['/keys', '/members']);
    for (const [name, p] of Object.entries(personas)) expect(p.expectedRoutes.length, name).toBeGreaterThan(0);
    expect([...personas.owner.expectedRoutes].length).toBe(10);
  });

  it('refuses an unknown persona before it builds or serves, naming the declared ones', () => {
    const r = run('--as', 'nobody');
    expect(r.status).not.toBe(0);
    const said = `${r.stdout}${r.stderr}`;
    for (const name of ['owner', 'admin', 'member', 'key-manager', 'viewer']) expect(said, name).toContain(name);
    expect(said).not.toMatch(/^ok\s+build/m);
  });

  it('refuses --as with --perf', () => {
    const r = run('--as', 'viewer', '--perf');
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/--perf/);
  });
});
