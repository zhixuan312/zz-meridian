// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The Atlas's content is server code; the marker it imports is one only the bundler resolves.
vi.mock('server-only', () => ({}));

import { workspaces } from '@/app.config';
import { entries, entry, layerOf, PAGES, SECTIONS, specOf, stats } from '@/system/content';

const ROOT = path.resolve(import.meta.dirname, '..');
const all = entries();
const templateFolders = fs.readdirSync(path.join(ROOT, 'src/components/templates')).filter((n) => fs.existsSync(path.join(ROOT, 'src/components/templates', n, 'README.md'))).sort();
const layer4 = all.filter((e) => e.section === 'pages');
const layer5 = all.filter((e) => e.section === 'products');

describe('the Atlas\'s layers', () => {
  it('are six, numbered 0 to 5 from the tokens to the product, between the guides and the system\'s own pages', () => {
    expect(SECTIONS.map((s) => [s.id, s.num])).toEqual([['start', undefined], ['tokens', '0'], ['base', '1'], ['components', '2'], ['patterns', '3'], ['pages', '4'], ['products', '5'], ['system', undefined]]);
    expect(SECTIONS.find((s) => s.id === 'products')!.title).toBe('Product workspaces');
  });

  it('give every entry one address, under its own section', () => {
    expect(new Set(all.map((e) => e.href)).size).toBe(all.length);
    for (const e of all) expect(e.href, e.id).toBe(`/system/${e.section}/${e.id}`);
    for (const e of all) expect(SECTIONS.map((s) => s.id), e.href).toContain(e.section);
  });

  it('keep every address the Atlas had', () => {
    const hrefs = all.map((e) => e.href);
    for (const href of ['/system/start/overview', '/system/start/start-a-dashboard', '/system/tokens/colour', '/system/base/shell', '/system/components/button', '/system/patterns/rail', '/system/patterns/trend-chart', '/system/pages/template-records', '/system/pages/home', '/system/pages/services', '/system/pages/proposal', '/system/system/changelog']) expect(hrefs, href).toContain(href);
  });

  it('name an entry by its layer, and by what it is in layer 4', () => {
    expect(layerOf(entry('tokens', 'colour')!)).toBe('Layer 0 · Tokens');
    expect(layerOf(entry('components', 'button')!)).toBe('Layer 2 · Components');
    expect(layerOf(entry('pages', 'template-records')!)).toBe('Layer 4 · Page template');
    expect(layerOf(entry('pages', 'customers')!)).toBe('Layer 4 · Page');
    expect(layerOf(entry('products', 'workspaces')!)).toBe('Layer 5 · Product workspaces');
    expect(layerOf(entry('start', 'surfaces')!)).toBe('Start here');
  });
});

describe('layer 4', () => {
  it('tells a reusable template from a page bound to the product', () => {
    expect([...new Set(layer4.map((e) => e.kind))].sort()).toEqual(['page', 'template']);
    expect(layer4.filter((e) => e.kind === 'template').map((e) => e.id).sort()).toEqual(templateFolders.map((n) => `template-${n}`));
    for (const e of layer4.filter((x) => x.kind === 'template')) expect(fs.existsSync(path.join(ROOT, e.source, 'README.md')), e.id).toBe(true);
    // Its specification is its card's, read as a card's is.
    expect(specOf(entry('pages', 'template-records')!).title).toBe('Records');
    expect(layer4.filter((e) => e.kind === 'page').map((e) => e.id)).toEqual(PAGES.map((p) => p.id));
    for (const e of layer4.filter((x) => x.kind === 'page')) expect(fs.existsSync(path.join(ROOT, e.source)), e.id).toBe(true);
  });

  it('says which template a page is built from, and every template has a page built from it', () => {
    const built = layer4.filter((e) => e.kind === 'page' && e.template);
    for (const e of built) expect(layer4.some((t) => t.kind === 'template' && t.id === e.template), `${e.id} names ${e.template}`).toBe(true);
    for (const t of layer4.filter((e) => e.kind === 'template')) expect(built.filter((e) => e.template === t.id).length, t.id).toBeGreaterThan(0);
    expect(built.map((e) => e.id)).toEqual(expect.arrayContaining(['customers', 'requests', 'tickets']));
    // A template is not built from one, and neither is a page that arranges its own patterns.
    expect(layer4.find((e) => e.id === 'template-records')!.template).toBeUndefined();
    expect(layer4.find((e) => e.id === 'home')!.template).toBeUndefined();
  });
});

describe('layer 5', () => {
  it('is one entry, the product\'s three workspaces, read from the product\'s guide', () => {
    expect(layer5.map((e) => [e.id, e.kind, e.href])).toEqual([['workspaces', 'doc', '/system/products/workspaces']]);
    expect(fs.existsSync(path.join(ROOT, layer5[0].source))).toBe(true);
    expect(specOf(layer5[0]).title.length).toBeGreaterThan(0);
    expect(layer5[0].summary.length).toBeGreaterThan(20);
  });

  it('links each workspace\'s home and every page template', () => {
    const { body } = specOf(layer5[0]);
    for (const id of Object.keys(workspaces) as (keyof typeof workspaces)[]) expect(body, id).toContain(`](${workspaces[id].homeHref})`);
    for (const t of layer4.filter((e) => e.kind === 'template')) expect(body, t.id).toContain(`](${t.href})`);
  });
});

describe('the front door\'s figures', () => {
  it('count templates and bound pages apart, from what is there', () => {
    const s = stats();
    expect(s.pages).toBe(PAGES.length);
    expect(s.templates).toBe(templateFolders.length);
  });
});
