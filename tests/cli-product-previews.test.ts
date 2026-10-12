// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads scripts/brand.ts against this repository's own tests.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const brand = fs.readFileSync(path.join(ROOT, 'scripts/brand.ts'), 'utf8');
const shipped = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.tsx?$/.test(f) && !f.startsWith('cli-') && !f.startsWith('deep-'));
/** A product keeps its components and loses every preview and every spec: a test that imports one, or reads one, cannot run there. */
const needsThem = (t: string) => { const src = fs.readFileSync(path.join(ROOT, 'tests', t), 'utf8'); return /from '[^']*\/preview'/.test(src) || /README\.md/.test(src); };

describe('a product keeps no test of a preview or a spec it removes', () => {
  it('finds the shipped tests that draw a preview or read a spec', () => {
    const found = shipped.filter(needsThem);
    expect(found).toContain('atlas-product-slice.test.tsx');
    expect(found).toContain('atlas-template-contracts.test.tsx');
  });

  it('removes each of them with brand --product', () => {
    for (const t of shipped.filter(needsThem)) expect(brand, t).toContain(`'tests/${t}'`);
  });
});
