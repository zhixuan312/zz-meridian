// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the brand script's own lists, which is a matter for this repository.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const brand = fs.readFileSync(path.join(ROOT, 'scripts/brand.ts'), 'utf8');

/** The Atlas-only modules `brand --no-atlas` removes from src/system (every `create` runs it), as the script names them. */
const atlasOnly = [...(/const atlasOnly = \[([^\]]*)\]/.exec(brand)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => `system/${m[1].replace(/\.tsx?$/, '')}`);
/** The script's own lines for the Atlas removal: from its list of modules to where the product removal begins. */
const atlasBlock = brand.slice(brand.indexOf('const atlasOnly = ['), brand.indexOf("if (has('--product'))"));
/** The tests a project is given: the package leaves out tests/cli-*.test.ts and tests/deep-*. */
// What the package leaves out is every cli-* and deep-* test, `.tsx` as much as `.ts`: the exclusion used to end in
// `\.test\.ts$`, so the 27 cli-*.test.tsx files counted as shipped and a product would have been held to them.
const shipped = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.tsx?$/.test(f) && !/^(cli-|deep-)/.test(f));

describe('a project without the Atlas keeps no test of a module it does not keep', () => {
  it('reads the modules the brand script removes with the Atlas', () => {
    expect(atlasBlock.length).toBeGreaterThan(100);
    expect(atlasOnly).toContain('system/content');
    expect(atlasOnly).toContain('system/card-stage');
    expect(atlasOnly.length).toBeGreaterThan(5);
  });

  for (const t of shipped) {
    const src = fs.readFileSync(path.join(ROOT, 'tests', t), 'utf8');
    const removed = atlasOnly.filter((m) => src.includes(`'@/${m}'`));
    const routes = /['"`](?:\.\.\/)+app\/system\//.test(src);
    if (!removed.length && !routes) continue;
    it(`tests/${t} goes with ${removed.length ? removed.join(', ') : 'the Atlas\'s routes'}`, () => {
      // In the Atlas removal itself: the product removal runs only for `--product`, and a comment removes nothing.
      expect(atlasBlock.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')).toContain(`'tests/${t}'`);
    });
  }

  it('finds at least the two tests that import an Atlas-only module today', () => {
    const importing = shipped.filter((t) => { const src = fs.readFileSync(path.join(ROOT, 'tests', t), 'utf8'); return atlasOnly.some((m) => src.includes(`'@/${m}'`)); });
    expect(importing).toEqual(expect.arrayContaining(['atlas-layers.test.ts', 'card-stage-hydration.test.tsx']));
  });
});
