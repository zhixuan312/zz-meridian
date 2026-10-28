// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { navUnderProblems } from '../scripts/lib/nav-under.ts';

type Item = { href: string; workspace?: string; under?: string };
const at = (href: string, extra: Omit<Item, 'href'> = {}): Item => ({ href, ...extra });
const P = 'src/app.config.ts: nav item';

// Navigations of this test's own, never the sample's: a created project that edits its navigation keeps this green.
describe("the gate's rules for a sub page's under", () => {
  it('pass a navigation with no under, and one whose sub pages name a parent of their own group', () => {
    expect(navUnderProblems([{ items: [at('/'), at('/usage')] }])).toEqual([]);
    expect(navUnderProblems([
      { items: [at('/')] },
      { label: 'Traffic', items: [at('/usage', { workspace: 'business' }), at('/requests', { workspace: 'business', under: '/usage' })] },
    ])).toEqual([]);
  });

  it('refuse an under that names no item of its group, an item of another group included', () => {
    expect(navUnderProblems([
      { items: [at('/'), at('/usage')] },
      { items: [at('/requests', { under: '/usage' }), at('/errors', { under: '/nowhere' })] },
    ])).toEqual([
      `${P} /requests is under /usage, which is no item of its group`,
      `${P} /errors is under /nowhere, which is no item of its group`,
    ]);
  });

  it('refuse an under that names the item itself', () => {
    expect(navUnderProblems([{ items: [at('/usage', { under: '/usage' })] }])).toEqual([`${P} /usage is under itself`]);
  });

  it('refuse a fourth level: an under that names an item which is itself under another', () => {
    expect(navUnderProblems([{ items: [at('/usage'), at('/requests', { under: '/usage' }), at('/requests/slow', { under: '/requests' })] }])).toEqual([
      `${P} /requests/slow is under /requests, which is itself under /usage; the rail has three levels, never four`,
    ]);
  });

  it('refuse a sub page in another workspace than its parent, a declared and an undeclared one counting as different', () => {
    expect(navUnderProblems([{ items: [at('/usage', { workspace: 'business' }), at('/requests', { workspace: 'engineering', under: '/usage' }), at('/errors', { under: '/usage' })] }])).toEqual([
      `${P} /requests is in workspace engineering under /usage, which is in workspace business`,
      `${P} /errors is in workspace none under /usage, which is in workspace business`,
    ]);
  });

  it('refuse more than seven sub pages under one parent, on the parent, and pass seven', () => {
    const subs = (n: number) => Array.from({ length: n }, (_, i) => at(`/usage/${i + 1}`, { under: '/usage' }));
    expect(navUnderProblems([{ items: [at('/usage'), ...subs(7)] }])).toEqual([]);
    expect(navUnderProblems([{ items: [at('/usage'), ...subs(8)] }])).toEqual([`${P} /usage has 8 sub pages; at most 7, past that the item is a group of its own`]);
  });

  it('run in the gate, over the navigation the project declares', () => {
    const gate = fs.readFileSync(path.resolve(import.meta.dirname, '../scripts/check.ts'), 'utf8');
    expect(gate).toMatch(/import \{[^}]*\bnavUnderProblems\b[^}]*\} from '\.\/lib\/nav-under\.ts'/);
    expect(gate).toMatch(/navUnderProblems\(nav\)/);
  });
});
