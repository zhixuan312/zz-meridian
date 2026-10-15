import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { exploreSurfaces } from '../scripts/lib/sample.ts';

const write = (root: string, rel: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), ''); };

describe('the sample pages whose prepared query the walk-through asks', () => {
  // A project made from the template may have replaced them: the template's own repository, which keeps the Atlas, has both.
  it.skipIf(!fs.existsSync(path.resolve(import.meta.dirname, '../app/system')))('are both present in the template', () => {
    expect(exploreSurfaces(path.resolve(import.meta.dirname, '..'), 'app')).toEqual({ usage: true, tests: true });
  });
  it('are absent from a product that has neither, so their steps are not applicable', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'explore-surfaces-'));
    write(root, 'app/(dashboard)/orders/page.tsx');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: false, tests: false });
  });
  it('need the page and the file that declares its prepared query', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'explore-surfaces-'));
    write(root, 'app/(dashboard)/usage/page.tsx');
    write(root, 'src/views/tests-explore.ts');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: false, tests: false });
    write(root, 'src/views/usage-explore.ts');
    write(root, 'app/(dashboard)/tests/page.tsx');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: true, tests: true });
  });
});
