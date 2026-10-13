// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads two guides, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { nav, workspaces } from '@/app.config';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const guide = read('docs/product-workspaces.md');
const surfaces = read('docs/surfaces.md');
const IDS = Object.keys(workspaces) as (keyof typeof workspaces)[];
const items = nav.flatMap((g) => g.items);
const templates = fs.readdirSync(path.join(ROOT, 'src/components/templates')).filter((n) => fs.existsSync(path.join(ROOT, 'src/components/templates', n, 'README.md')));
const headings = (md: string) => md.split('\n').filter((l) => l.startsWith('## ')).map((l) => l.slice(3).trim());

describe('the product guide', () => {
  it('opens with a title and a sentence that says what it is', () => {
    expect(guide).toMatch(/^# \S.*\n\n[A-Z]/);
  });

  it('answers a reader\'s questions in the order they are asked', () => {
    expect(headings(guide)).toEqual(['The three workspaces', 'Where each destination lives', 'How a page finds its workspace', 'Who can do what', 'Tasks to try', 'Three meanings of "workspace"', 'Making your own', 'What it does not do']);
  });

  it('names each workspace, says who it is for in the declaration\'s own words, and links its home', () => {
    for (const id of IDS) {
      expect(guide, id).toContain(workspaces[id].label);
      expect(guide, id).toContain(workspaces[id].audience);
      expect(guide, id).toContain(`](${workspaces[id].homeHref})`);
    }
  });

  it('lists the fifteen destinations in the navigation\'s order, each by its name, its address and its workspace', () => {
    const rows = guide.split('\n').filter((l) => l.trim().startsWith('|'));
    const at = items.map((i) => rows.findIndex((r) => r.includes(`| ${i.label} |`) && r.includes('`' + i.href + '`') && r.includes(workspaces[i.workspace!].label)));
    expect(at.filter((n) => n < 0)).toEqual([]);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(new Set(at).size).toBe(items.length);
  });

  it('says what a Viewer reaches: thirteen of the fifteen, and neither Members nor API keys', () => {
    expect(guide).toMatch(/\bthirteen\b/i);
    expect(guide).toMatch(/Viewer[^.]*\b(Members|API keys)\b[^.]*\b(Members|API keys)\b/);
  });

  it('keeps the three meanings of the word apart, by the names the code gives them', () => {
    const section = guide.slice(guide.indexOf('## Three meanings of "workspace"'), guide.indexOf('## Making your own'));
    expect(section).toContain('`workspaces`');
    expect(section).toContain('`app.workspace`');
    expect(section).toMatch(/`workspace` collection/);
  });

  it('links every page template the product is built from', () => {
    expect(templates.length).toBeGreaterThan(0);
    for (const name of templates) expect(guide, name).toContain(`](/system/pages/template-${name})`);
  });

  it('says plainly what the sample does not do', () => {
    const limits = guide.slice(guide.indexOf('## What it does not do'));
    expect(limits).toMatch(/Back/);
    expect(limits).toMatch(/access|permission/i);
    expect(limits.split('\n').filter((l) => l.startsWith('- ')).length).toBeGreaterThan(3);
  });

  it('leaves no placeholder', () => {
    expect(guide).not.toMatch(/\b(TODO|TBD|lorem|coming soon)\b/i);
  });
});

describe('the inventory of surfaces', () => {
  it('has a layer 5, which points at the product guide', () => {
    const at = surfaces.indexOf('### Layer 5 · Product workspaces');
    expect(at).toBeGreaterThan(surfaces.indexOf('### Layer 4 · Pages'));
    expect(surfaces.slice(at)).toContain('product-workspaces.md');
  });

  it('lists every page the product has in layer 4, and the template they share', () => {
    const layer4 = surfaces.slice(surfaces.indexOf('### Layer 4 · Pages'), surfaces.indexOf('### Layer 5 · Product workspaces'));
    for (const name of ['Operations tickets', 'Tests and verification', 'Releases', 'Records']) expect(layer4, name).toContain(`| ${name}`);
  });
});
