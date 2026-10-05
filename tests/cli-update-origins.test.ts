// @vitest-environment node
// Defects the published-0.3.0 create origin found in the consumer smoke, pinned at the lowest layer that shows them.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { sha256 } from '../cli/src/files.ts';
import { start, type Context, type Release } from '../cli/src/session.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const tmp: string[] = [];
afterAll(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zz-origins-')); tmp.push(d); return d; };
const put = (root: string, files: Record<string, string>) => {
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), c); }
};
const git = (root: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' });

describe('a project created with 0.3.0', () => {
  it('updates although its manifest records the team-owned .env.example', () => {
    const ui = 'src/components/ui/a/index.tsx';
    const release = (version: string, content: string): Release => {
      const tree = mk();
      put(tree, { [ui]: content });
      return { version, payload: [ui], tree, hashes: new Map([[ui, sha256(content)]]), agents: null, changelog: '', pkg: {} };
    };
    const root = mk();
    put(root, {
      [ui]: 'a1', '.env.example': 'ASSISTANT_PROVIDER=\n', 'package.json': '{\n  "name": "team-app"\n}\n',
      '.meridian/manifest.json': JSON.stringify({ version: '0.3.0', route: 'create', brand: { name: 'Acme' }, files: { [ui]: sha256('a1'), '.env.example': sha256('ASSISTANT_PROVIDER=\n') } }),
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'created');
    const lines: string[] = [];
    const base = release('0.3.0', 'a1');
    const target = release('0.5.0', 'a2');
    const ctx: Context = { root, version: '0.5.0', targetIntegrity: 'sha512-test', source: () => base, target: () => target, run: () => ({ status: 0, output: '' }), log: (l) => lines.push(l) };
    expect(start(ctx, { dryRun: true, allowDirty: false, install: false, verbose: true }), lines.join('\n')).toBe(0);
    expect(lines.join('\n')).toMatch(/team-preserved\s+\.env\.example/);
  });

  it("keeps the gate's dormant-export rule off Meridian's managed modules, as in an adopted project", () => {
    const dir = mk();
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && !f.startsWith('cli/'));
    for (const f of tracked) {
      const src = path.join(ROOT, f);
      if (!fs.lstatSync(src, { throwIfNoEntry: false })?.isFile()) continue;
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.copyFileSync(src, path.join(dir, f));
    }
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
    // A newer release adds an export to a managed module that the team's own code does not import yet.
    const prompt = 'src/lib/assistant/prompt.ts';
    fs.appendFileSync(path.join(dir, prompt), '\nexport const addedByANewerRelease = 1;\n');
    const check = () => spawnSync(process.execPath, ['scripts/check.ts'], { cwd: dir, encoding: 'utf8' });
    const template = check();
    expect(template.stdout).toContain(`${prompt}: exports addedByANewerRelease`);
    put(dir, { '.meridian/manifest.json': JSON.stringify({ version: '0.5.0', route: 'create', brand: { name: 'Acme' }, files: { [prompt]: sha256(fs.readFileSync(path.join(dir, prompt))) } }) });
    const created = check();
    expect(created.stdout).not.toContain('addedByANewerRelease');
  }, 60_000);
});
