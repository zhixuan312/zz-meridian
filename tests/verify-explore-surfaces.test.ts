import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { exploreSurfaces } from '../scripts/lib/sample.ts';

const write = (root: string, rel: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), ''); };
const roots: string[] = [];
const scratch = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'explore-surfaces-'));
  roots.push(root);
  return root;
};
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('the sample pages whose prepared query the walk-through asks', () => {
  it('are absent from a product that has neither, so their steps are not applicable', () => {
    const root = scratch();
    write(root, 'app/(dashboard)/orders/page.tsx');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: false, tests: false });
  });
  it('need the page and the file that declares its prepared query', () => {
    const root = scratch();
    write(root, 'app/(dashboard)/usage/page.tsx');
    write(root, 'src/logic/tests-explore.ts');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: false, tests: false });
    write(root, 'src/logic/usage-explore.ts');
    write(root, 'app/(dashboard)/tests/page.tsx');
    expect(exploreSurfaces(root, 'app')).toEqual({ usage: true, tests: true });
  });
});
