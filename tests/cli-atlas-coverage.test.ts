// @vitest-environment node
// Named cli-* so the payload leaves it out: an adopted project has no Atlas for these runs to list.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const list = (script: string, ...args: string[]) => spawnSync(process.execPath, [script, ...args, '--list'], { cwd: ROOT, encoding: 'utf8' });

/**
 * What an Atlas run covers, asked of the run itself. `audit.ts --atlas` read the Atlas's entries through a module that
 * imports `server-only`, which plain Node cannot resolve, caught the failure and went on with the cards alone: for as
 * long as that stood, a run said "the Atlas" and visited 142 of its 172 routes, with every token view, page spec and
 * guide unmeasured and nothing in the output to say so.
 */
describe('an Atlas run', () => {
  const cards = [...fs.readFileSync(path.join(ROOT, 'app/system/preview/[section]/[card]/keys.ts'), 'utf8').matchAll(/'([a-z]+\/[a-z0-9-]+)'/g)].map((m) => m[1]);

  it('audits every entry the Atlas serves, not only its cards', () => {
    const r = list('scripts/audit.ts', '--atlas');
    expect(r.status, r.stderr).toBe(0);
    const routes = r.stdout.split('\n').filter((l) => l.startsWith('/'));
    for (const k of cards) expect(routes).toEqual(expect.arrayContaining([`/system/${k}`, `/system/preview/${k}`]));
    // One of each kind that lives under a dynamic segment, which is what was being missed.
    expect(routes).toEqual(expect.arrayContaining(['/system/tokens/colour', '/system/pages/home', '/system/start/start-a-dashboard']));
    expect(routes.length).toBeGreaterThan(cards.length * 2);
    expect(r.stdout).toMatch(/atlas: \d+ cards, \d+ token views, \d+ page specs, \d+ guides, and \d+ bare previews/);
  });

  it('measures the vitals of every entry with --atlas, and of the Atlas\'s sample by default', () => {
    const all = list('scripts/vitals.ts', '--atlas');
    expect(all.status, all.stderr).toBe(0);
    const routes = all.stdout.split('\n').filter((l) => l.startsWith('/'));
    expect(routes).toEqual(expect.arrayContaining(['/system/tokens/colour', '/system/pages/home', '/system/start/start-a-dashboard', `/system/${cards[0]}`]));
    expect(routes.some((r) => r.startsWith('/system/preview/'))).toBe(false);
    const usual = list('scripts/vitals.ts').stdout.split('\n');
    expect(usual).toEqual(expect.arrayContaining(['/', '/system', '/system/components/button']));
  });
});
