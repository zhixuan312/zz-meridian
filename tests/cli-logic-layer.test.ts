// @vitest-environment node
// Named cli-* so the payload leaves it out: it checks the sample's logic-to-view import boundary.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { walk as walkTree } from '../scripts/lib/layer-rules.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string) => walkTree(ROOT, dir, /./);
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the logic layer', () => {
  it('never reaches up into the views it sits above', () => {
    const reaching = walk('src/logic')
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /from\s+['"]@\/views|from\s+['"]\.\.\/views/.test(source(f)));
    expect(reaching).toEqual([]);
  });

});
