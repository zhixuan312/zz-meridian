// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { start, type Context, type Release } from '../cli/src/session.ts';

const dirs: string[] = [];
const temp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-import-edit-')); dirs.push(dir); return dir; };
const put = (root: string, rel: string, value: string) => { const dest = path.join(root, rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); };
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('update preserves text that resembles an import', () => {
  it('stages a changed rendered string rather than silently replacing it with the release', () => {
    const file = 'src/components/patterns/example/index.tsx';
    const before = 'export const text = "from \'../../ui/badge/index\'";\n';
    const ours = 'export const text = "from \'@/components/ui/badge\'";\n';
    const release = (version: string, text: string): Release => {
      const tree = temp(); put(tree, file, text);
      return { version, payload: [file], tree, hashes: new Map([[file, sha256(text)]]), agents: null, changelog: '', pkg: {} };
    };
    const root = temp();
    put(root, file, ours);
    put(root, 'package.json', '{"name":"team"}');
    put(root, 'tsconfig.json', '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}');
    put(root, '.meridian/manifest.json', JSON.stringify({ version: '0.37.0', route: 'adopt', brand: {}, files: { [file]: sha256(before) } }));
    const base = release('0.37.0', before), target = release('0.37.1', 'export const text = "release replacement";\n');
    const ctx: Context = { root, version: '0.37.1', targetIntegrity: 'sha512-test', source: () => base, target: () => target, run: () => ({ status: 0, output: '' }), log: () => {} };
    expect(start(ctx, { dryRun: false, allowDirty: true, install: false, verbose: false })).toBe(2);
    expect(fs.readFileSync(path.join(root, file), 'utf8')).toBe(ours);
    const session = path.join(root, '.meridian/update/0.37.1');
    const journal = JSON.parse(fs.readFileSync(path.join(session, 'state.json'), 'utf8'));
    expect(journal.operations.find((op: { path: string }) => op.path === file)).toMatchObject({ disposition: 'edited', action: 'stage' });
    expect(fs.readFileSync(path.join(session, 'ours', file), 'utf8')).toBe(ours);
  });
});
