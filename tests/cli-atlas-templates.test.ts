// @vitest-environment node
// Named cli-* so the payload leaves it out: a product without the Atlas has no card specs for these to read.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cards } from '../scripts/registry.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = 'src/components/templates/records';

describe('the Atlas discovers a page template', () => {
  it('lists the records template as a layer-4 card in Pages, under an id no page can take', () => {
    expect(cards().find((c) => c.dir === DIR)).toMatchObject({ id: 'template-records', layer: 4, section: 'pages', dir: DIR, hasPreview: true });
  });

  it('leaves every other card under its folder name', () => {
    const rest = cards().filter((c) => !c.dir.startsWith('src/components/templates/'));
    expect(rest.length).toBeGreaterThan(0);
    for (const c of rest) expect(c.id, c.dir).toBe(path.basename(c.dir));
  });

  it('serves it once, at its own address in the Atlas', () => {
    const r = spawnSync(process.execPath, ['scripts/vitals.ts', '--atlas', '--list'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.split('\n').filter((route) => route === '/system/pages/template-records')).toEqual(['/system/pages/template-records']);
  });

  it('has the spec a template owes', () => {
    const md = fs.readFileSync(path.join(ROOT, DIR, 'README.md'), 'utf8');
    expect(md).toMatch(/^Status: (draft|beta)$/m);
    for (const heading of ['## States', '## Surfaces', '## Agents', '## Accessibility']) expect(md, heading).toContain(heading);
    const states = (md.split(/^## States$/m)[1] ?? '').split(/^## /m)[0].toLowerCase();
    for (const state of ['normal', 'loading', 'filtered-empty', 'error', 'partial', 'read-only']) expect(states, state).toContain(state);
    expect(states.replace(/filtered-empty/g, ''), 'empty').toContain('empty');
  });
});
