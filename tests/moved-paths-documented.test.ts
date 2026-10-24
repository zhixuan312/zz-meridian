// @vitest-environment node
// A path that moved is named in one place: where the module now lives. The record of what was built keeps the old
// one on purpose, so this file also fails if a sweep goes through the history.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROOTS = ['app', 'src', 'docs', 'skills/zz-meridian', 'tests', 'scripts'];
const HISTORY = [
  'CHANGELOG.md',
  'cli/src/migrations.ts',
  'tests/cli-migrations.test.ts',
  'tests/cli-old-names.test.ts',
];
const SELF = 'tests/moved-paths-documented.test.ts';
const TEXT = /\.(md|ts|tsx)$/;
const STALE = /src\/views\/([a-z0-9-]+)\.ts\b/g;

const walk = (dir: string, out: string[] = []): string[] => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (TEXT.test(entry.name)) out.push(rel);
  }
  return out;
};
const source = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the paths a move leaves behind', () => {
  it('names no module under src/views that now lives in src/logic', () => {
    const stale: string[] = [];
    for (const rel of ROOTS.flatMap((root) => walk(root))) {
      if (HISTORY.includes(rel) || rel === SELF) continue;
      for (const hit of source(rel).match(STALE) ?? []) {
        if (hit !== 'src/views/workspaces.ts') stale.push(`${rel}: ${hit}`);
      }
    }
    expect(stale).toEqual([]);
  });

  // The record of what was built is this repository's own: a project `create` makes has no `CHANGELOG.md` and no CLI
  // source, so only a checkout that holds them can be asked what the record says. `cli/src/migrations.ts` stands for the
  // record as a whole, because it is one of the files this test reads and no created project carries it.
  it.skipIf(!fs.existsSync(path.join(ROOT, 'cli/src/migrations.ts')))('leaves the record of what was built as it was written', () => {
    for (const rel of HISTORY) expect(source(rel).match(STALE) ?? [], rel).not.toEqual([]);
  });
});
