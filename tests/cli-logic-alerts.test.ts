// @vitest-environment node
// Named cli-* so the payload leaves it out: it checks the sample's data-to-logic import boundary.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { walk as walkTree } from '../scripts/lib/layer-rules.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (dir: string) => walkTree(ROOT, dir, /./);
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the data layer', () => {
  it('leaves no data module importing the logic layer above it', () => {
    const reaching = walk('src/data')
      .filter((f) => f.endsWith('.ts'))
      // `scripts/check.ts` holds this rule as `data-imports-neither`, and it honours the
      // documented escape on the import's line: an import that states why is a deviation the gate already reports.
      .filter((f) => source(f).split('\n').some((line) => /from\s+['"]@\/logic\//.test(line) && !line.includes('allow-data-imports-neither:')));
    expect(reaching).toEqual([]);
  });

});
