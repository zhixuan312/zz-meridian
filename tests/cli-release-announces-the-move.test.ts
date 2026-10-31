// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RELEASE_MIGRATIONS } from '../cli/src/migrations.ts';

const entry = RELEASE_MIGRATIONS.find((m) => m.id === 'four-layers');

const tmp: string[] = [];
afterAll(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

/** A project with one file of its own that imports from the paths the move left behind. */
function project(source: string | null): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-move-'));
  tmp.push(root);
  if (source !== null) {
    fs.mkdirSync(path.join(root, 'app'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app', 'page.tsx'), source);
  }
  return root;
}

describe('the release that moved the logic layer', () => {
  it('applies to a project that imports an old path, and to none that does not', () => {
    const old = project("import { homeContext } from '@/views/home-context';\nexport default homeContext;\n");
    const moved = project("import { alerts } from '@/data/alerts';\nexport default alerts;\n");
    const own = project("import { readAll } from '@/data/read';\nexport default readAll;\n");
    const none = project(null);
    // Not `not.toBeNull()`: an empty list is truthy, and a migration that reports no paths is one that names nothing to do.
    for (const root of [old, moved]) expect(entry!.applies(root, '0.27.0'), root).toContain('app/page.tsx');
    for (const root of [own, none]) expect(entry!.applies(root, '0.27.0'), root).toBeNull();
  });
});
