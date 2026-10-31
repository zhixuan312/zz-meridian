// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The Atlas's content is server code; the marker it imports is one only the bundler resolves.
vi.mock('server-only', () => ({}));

import { entries, PAGES, SECTIONS, specOf, stats } from '@/system/content';

const ROOT = path.resolve(import.meta.dirname, '..');
const all = entries();
const templateFolders = fs.readdirSync(path.join(ROOT, 'src/components/templates')).filter((n) => fs.existsSync(path.join(ROOT, 'src/components/templates', n, 'README.md'))).sort();
const layer4 = all.filter((e) => e.section === 'pages');

describe('the Atlas\'s layers', () => {

  it('give every entry one address, under its own section', () => {
    expect(new Set(all.map((e) => e.href)).size).toBe(all.length);
    for (const e of all) expect(e.href, e.id).toBe(`/system/${e.section}/${e.id}`);
    for (const e of all) expect(SECTIONS.map((s) => s.id), e.href).toContain(e.section);
  });

});

describe('layer 4', () => {
  it('tells a reusable template from a page bound to the product', () => {
    expect([...new Set(layer4.map((e) => e.kind))].sort()).toEqual(['page', 'template']);
    expect(layer4.filter((e) => e.kind === 'template').map((e) => e.id).sort()).toEqual(templateFolders.map((n) => `template-${n}`));
    expect(layer4.filter((e) => e.kind === 'page').map((e) => e.id)).toEqual(PAGES.map((p) => p.id));
  });

  it('says which template a page is built from, and every template has a page built from it', () => {
    const built = layer4.filter((e) => e.kind === 'page' && e.template);
    for (const e of built) expect(layer4.some((t) => t.kind === 'template' && t.id === e.template), `${e.id} names ${e.template}`).toBe(true);
    for (const t of layer4.filter((e) => e.kind === 'template')) expect(built.filter((e) => e.template === t.id).length, t.id).toBeGreaterThan(0);
    // A template is not built from one, and neither is a page that arranges its own patterns.
    expect(layer4.find((e) => e.id === 'template-records')!.template).toBeUndefined();
    expect(layer4.find((e) => e.id === 'home')!.template).toBeUndefined();
  });
});


describe('the front door\'s figures', () => {
  it('count templates and bound pages apart, from what is there', () => {
    const s = stats();
    expect(s.pages).toBe(PAGES.length);
    expect(s.templates).toBe(templateFolders.length);
  });

  it('count the themes and accents the token resolver offers, so a new accent is counted', () => {
    const resolver = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens/zz-meridian.resolver.json'), 'utf8'));
    expect(stats()).toMatchObject({ themes: Object.keys(resolver.modifiers.theme.contexts).length, accents: Object.keys(resolver.modifiers.accent.contexts).length });
  });
});

describe('the list the Atlas draws from', () => {
  it('is a copy per reader, so one that sorts it cannot reorder the page for the other', () => {
    // The sidebar and the article ask for the list in the same render. They share one read of the files, but not the array
    // they are handed: a section that sorted it in place would move the other's entries.
    const first = entries();
    const before = first.map((e) => e.href);
    first.reverse();
    first[0].title = 'moved';
    expect(entries().map((e) => e.href)).toEqual(before);
    expect(entries()[0].title).not.toBe('moved');
  });
});

describe("an Atlas page's lead", () => {
  it('is cut from its README whole, so the status and the body after it survive a paragraph wrapped over lines', () => {
    for (const e of entries()) {
      if (e.kind === 'tokens' || e.id === 'decisions') continue;
      const s = specOf(e);
      expect(s.body, `${e.section}/${e.id}`).not.toMatch(/^[.,;:]/);
      expect(s.body, `${e.section}/${e.id}`).not.toMatch(/^Status:/);
      expect(s.lead, `${e.section}/${e.id}`).not.toMatch(/\n/);
    }
  });
});
