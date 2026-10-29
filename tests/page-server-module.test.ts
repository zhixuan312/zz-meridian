// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = (dir: string): string[] =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const here = `${dir}/${e.name}`;
    return e.isDirectory() ? pages(here) : e.name === 'page.tsx' ? [here] : [];
  });

/**
 * A page is a server module, so it can name itself: a page marked 'use client' cannot export `metadata`, and its tab and
 * history entry read the product's name alone. The client part of a page lives in a file beside it.
 */
describe('every page', () => {
  it('is a server module', () => {
    const all = pages('app');
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter((f) => /^\s*['"]use client['"]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))).toEqual([]);
  });
});
