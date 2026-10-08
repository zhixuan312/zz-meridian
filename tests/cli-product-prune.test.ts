// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const brand = fs.readFileSync(path.join(ROOT, 'scripts/brand.ts'), 'utf8');

/** The modules a product (`brand --product`) removes from src/system, as brand.ts names them. */
const productRemoves = [...brand.matchAll(/for \(const f of \[([^\]]*)\]\) fs\.rmSync\(file\(f\), \{ force: true \}\)/g)]
  .flatMap((m) => [...m[1].matchAll(/'(src\/system\/[^']+)'/g)].map((x) => x[1].replace(/\.tsx?$/, '')));

describe('a product keeps no test of a module it removes', () => {
  it('reads the modules --product removes', () => {
    expect(productRemoves).toContain('src/system/specimen');
  });
  for (const t of fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.tsx?$/.test(f) && !f.startsWith('cli-') && !f.startsWith('deep-'))) {
    const src = fs.readFileSync(path.join(ROOT, 'tests', t), 'utf8');
    const removed = productRemoves.filter((m) => src.includes(`'@/${m.replace(/^src\//, '')}'`));
    if (!removed.length) continue;
    it(`tests/${t} goes with ${removed.join(', ')}`, () => {
      expect(brand).toContain(`'tests/${t}'`);
    });
  }
});
